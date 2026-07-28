"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import * as lock from "@/lib/appLock";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const TIMEOUT_OPTIONS = [
  { value: 0, label: "Inmediato" },
  { value: 1, label: "1 minuto" },
  { value: 5, label: "5 minutos" },
  { value: 15, label: "15 minutos" },
];

/** useSyncExternalStore en vez de useEffect+setState: mismo motivo que
 *  AppLockGate.tsx — snapshot estable, sin parpadeo de hidratación, y se
 *  refresca solo cuando lib/appLock.ts avisa (tras setPin/disableLock/etc). */
function useLockSettings(): lock.LockSettings {
  return useSyncExternalStore(lock.subscribeToLockSettings, lock.getLockSettings, lock.getLockSettingsServerSnapshot);
}

/** Todo el estado vive en localStorage (lib/appLock.ts) — nada de esto pasa
 *  por el servidor, así que no hay Server Actions acá, solo funciones
 *  llamadas directo desde el cliente. */
export function SecuritySettings() {
  const settings = useLockSettings();
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  // Genuinamente async (API del navegador) — setState en el .then() no es
  // el patrón síncrono que el lint de hooks marca.
  useEffect(() => {
    let cancelled = false;
    lock.isPlatformAuthenticatorAvailable().then((available) => {
      if (!cancelled) setWebAuthnSupported(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);
    if (pin1.length < 4 || pin1.length > 6) {
      setPinError("El PIN debe tener entre 4 y 6 dígitos.");
      return;
    }
    if (pin1 !== pin2) {
      setPinError("Los PIN no coinciden.");
      return;
    }
    await lock.setPin(pin1);
    setPin1("");
    setPin2("");
    setShowPinForm(false);
  }

  function disableLock() {
    lock.disableLock();
    setConfirmingDisable(false);
    setShowPinForm(false);
  }

  async function toggleBiometric() {
    setBiometricError(null);
    setBiometricBusy(true);
    if (settings.webauthnCredentialId) {
      lock.clearBiometric();
    } else {
      const ok = await lock.registerBiometric();
      if (!ok) {
        setBiometricError("No se pudo activar. Tu dispositivo puede no tener Face ID/Touch ID/Windows Hello configurado.");
      }
    }
    setBiometricBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Pide PIN (o biometría) para abrir Cachin&apos; en este dispositivo — nunca sale de aquí, no se guarda en el
        servidor.
      </p>

      {!settings.enabled ? (
        !showPinForm ? (
          <Button onClick={() => setShowPinForm(true)} size="sm">
            <Icon name="lock" size={16} />
            Activar bloqueo
          </Button>
        ) : (
          <form onSubmit={submitPin} className="flex flex-col gap-3">
            <Field label="Nuevo PIN" htmlFor="pin1" required>
              <Input
                id="pin1"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin1}
                onChange={(e) => setPin1(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                required
              />
            </Field>
            <Field label="Confirma el PIN" htmlFor="pin2" required>
              <Input
                id="pin2"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </Field>
            {pinError && <p className="text-sm text-danger">{pinError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowPinForm(false)} full>
                Cancelar
              </Button>
              <Button type="submit" full>
                Guardar PIN
              </Button>
            </div>
          </form>
        )
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-fg">
            <Icon name="check" size={16} />
            Bloqueo activado
          </div>

          {!showPinForm ? (
            <button
              onClick={() => setShowPinForm(true)}
              className="text-sm font-semibold text-primary-fg text-left cursor-pointer"
            >
              Cambiar PIN
            </button>
          ) : (
            <form onSubmit={submitPin} className="flex flex-col gap-3">
              <Field label="Nuevo PIN" htmlFor="pin1b" required>
                <Input
                  id="pin1b"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={pin1}
                  onChange={(e) => setPin1(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="4 a 6 dígitos"
                  required
                />
              </Field>
              <Field label="Confirma el PIN" htmlFor="pin2b" required>
                <Input
                  id="pin2b"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </Field>
              {pinError && <p className="text-sm text-danger">{pinError}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowPinForm(false)} full>
                  Cancelar
                </Button>
                <Button type="submit" full>
                  Guardar PIN
                </Button>
              </div>
            </form>
          )}

          <Field label="Bloquear después de" htmlFor="lock-timeout">
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
              <button
                onClick={toggleBiometric}
                disabled={biometricBusy}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-fg cursor-pointer disabled:opacity-60"
              >
                <Icon name="fingerprint" size={16} />
                {settings.webauthnCredentialId
                  ? "Desactivar Face ID / Touch ID / Windows Hello"
                  : "Activar Face ID / Touch ID / Windows Hello"}
              </button>
              {biometricError && <p className="text-sm text-danger mt-1">{biometricError}</p>}
            </div>
          )}

          <div className="pt-2 border-t border-line">
            {!confirmingDisable ? (
              <button
                onClick={() => setConfirmingDisable(true)}
                className="text-sm font-semibold text-danger cursor-pointer"
              >
                Desactivar bloqueo
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">¿Seguro?</span>
                <button onClick={disableLock} className="text-sm font-bold text-danger cursor-pointer">
                  Sí, desactivar
                </button>
                <button
                  onClick={() => setConfirmingDisable(false)}
                  className="text-sm font-semibold text-muted cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
