"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import * as lock from "@/lib/appLock";
import { Field, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CodeInput } from "@/components/ui/CodeInput";
import {
  activatePersonalCode,
  assignPersonalCode,
  checkPersonalCode,
  deactivatePersonalCode,
} from "@/app/(app)/configuracion/securityActions";

const TIMEOUT_OPTIONS = [
  { value: 0, label: "Inmediato" },
  { value: 1, label: "1 minuto" },
  { value: 5, label: "5 minutos" },
  { value: 15, label: "15 minutos" },
];

/** useSyncExternalStore en vez de useEffect+setState: mismo motivo que
 *  AppLockGate.tsx — snapshot estable, sin parpadeo de hidratación. Solo
 *  quedan acá las preferencias que SÍ son del dispositivo (cada cuánto
 *  re-bloquear, si este aparato tiene biometría registrada); el código en sí
 *  vive en el servidor. */
function useLockSettings(): lock.LockSettings {
  return useSyncExternalStore(
    lock.subscribeToLockSettings,
    lock.getLockSettings,
    lock.getLockSettingsServerSnapshot,
  );
}

export function SecuritySettings({
  hasCode,
  codeActive,
  configured,
}: {
  hasCode: boolean;
  codeActive: boolean;
  /** false si el servidor no tiene PERSONAL_CODE_SECRET: la función entera
   *  queda fuera en vez de ofrecer algo que no puede funcionar. */
  configured: boolean;
}) {
  const settings = useLockSettings();
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [bioBusy, setBioBusy] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioConfirm, setBioConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    lock.isPlatformAuthenticatorAvailable().then((available) => {
      if (!cancelled) setWebAuthnSupported(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function runAssign(fd: FormData) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await assignPersonalCode(fd);
      if (res.ok) {
        setShowForm(false);
        setNotice("Código guardado. Todavía falta activarlo.");
      } else setError(res.error ?? "No se pudo guardar.");
    });
  }

  function runActivate() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await activatePersonalCode();
      if (!res.ok) setError(res.error ?? "No se pudo activar.");
    });
  }

  function runDeactivate(fd: FormData) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await deactivatePersonalCode(fd);
      if (res.ok) setShowDisable(false);
      else setError(res.error ?? "No se pudo desactivar.");
    });
  }

  /** Apagar la biometría exige el código. Antes era un botón suelto: a quien
   *  tomara el teléfono desbloqueado le bastaba con pulsarlo para quitar el
   *  sensor de en medio y quedarse solo con el código, o sin nada. */
  function runBiometric(fd: FormData) {
    setBioError(null);
    startTransition(async () => {
      const res = await checkPersonalCode(String(fd.get("code") ?? ""));
      if (!res.ok) {
        setBioError(res.error ?? "Código incorrecto.");
        return;
      }
      lock.clearBiometric();
      setBioConfirm(false);
    });
  }

  async function enableBiometric() {
    setBioError(null);
    setBioBusy(true);
    const ok = await lock.registerBiometric();
    if (!ok) {
      setBioError("No se pudo activar. Puede que este dispositivo no tenga un dato biométrico configurado.");
    }
    setBioBusy(false);
  }

  if (!configured) {
    return (
      <p className="text-xs text-muted">
        El código personal no está disponible en este servidor. Configura la variable de entorno{" "}
        <code className="font-mono">PERSONAL_CODE_SECRET</code> para habilitarlo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Un código de 6 dígitos que se te pide al iniciar sesión, además de tu contraseña. Se
        verifica en el servidor, así que también protege tu cuenta desde otros dispositivos.
      </p>

      {/* Asignar y activar son DOS pasos, y el estado dice en cuál estás. */}
      <div className="flex items-center gap-2 text-sm font-semibold">
        {codeActive ? (
          <>
            <Icon name="check" size={16} className="text-primary-fg" />
            <span className="text-primary-fg">Código activo</span>
          </>
        ) : hasCode ? (
          <>
            <Icon name="alert" size={16} className="text-warning" />
            <span className="text-warning">Asignado, pero sin activar</span>
          </>
        ) : (
          <>
            <Icon name="lock" size={16} className="text-muted" />
            <span className="text-muted">Sin código</span>
          </>
        )}
      </div>

      {notice && <p className="text-xs text-muted">{notice}</p>}

      {!showForm ? (
        <button
          onClick={() => {
            setShowForm(true);
            setNotice(null);
          }}
          className="touch-target text-sm font-semibold text-primary-fg text-left cursor-pointer"
        >
          {hasCode ? "Cambiar código personal" : "Asignar código personal"}
        </button>
      ) : (
        <form action={runAssign} className="flex flex-col gap-3">
          <Field label="Código de 6 dígitos" htmlFor="pc-1" required>
            <CodeInput name="code" aria-label="Código personal" disabled={pending} />
          </Field>
          {/* Repetirlo evita el error de tipeo que dejaría a alguien fuera con
              un código que nunca quiso poner. */}
          <Field label="Repítelo" htmlFor="pc-2" required>
            <CodeInput name="code_confirm" aria-label="Repite el código" disabled={pending} />
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)} full>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} full>
              Guardar
            </Button>
          </div>
        </form>
      )}

      {hasCode && !codeActive && (
        <Button onClick={runActivate} loading={pending} size="sm">
          <Icon name="lock" size={16} />
          Activar al iniciar sesión
        </Button>
      )}

      {codeActive && (
        <>
          <Field label="Volver a pedirlo tras" htmlFor="lock-timeout">
            <Select
              id="lock-timeout"
              value={String(settings.timeoutMinutes)}
              onChange={(e) => lock.setTimeoutMinutes(Number(e.target.value))}
            >
              {TIMEOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          {webAuthnSupported && (
            <div>
              {settings.webauthnCredentialId ? (
                !bioConfirm ? (
                  <button
                    onClick={() => setBioConfirm(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-fg cursor-pointer"
                  >
                    <Icon name="fingerprint" size={16} />
                    Desactivar dato biométrico
                  </button>
                ) : (
                  <form action={runBiometric} className="flex flex-col gap-2">
                    <p className="text-xs text-muted">Escribe tu código para desactivarlo.</p>
                    <CodeInput name="code" aria-label="Código personal" disabled={pending} />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setBioConfirm(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" loading={pending}>
                        Desactivar
                      </Button>
                    </div>
                  </form>
                )
              ) : (
                <button
                  onClick={enableBiometric}
                  disabled={bioBusy}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-fg cursor-pointer disabled:opacity-60"
                >
                  <Icon name="fingerprint" size={16} />
                  Activar dato biométrico
                </button>
              )}
              {bioError && <p className="text-sm text-danger mt-1">{bioError}</p>}
            </div>
          )}

          <div className="pt-2 border-t border-line">
            {!showDisable ? (
              <button
                onClick={() => setShowDisable(true)}
                className="text-sm font-semibold text-danger cursor-pointer"
              >
                Desactivar código personal
              </button>
            ) : (
              <form action={runDeactivate} className="flex flex-col gap-2">
                <p className="text-xs text-muted">
                  Escribe tu código actual para confirmar. Se borrará y dejará de pedirse.
                </p>
                <CodeInput name="code" aria-label="Código personal" disabled={pending} />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDisable(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" loading={pending}>
                    Desactivar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
