"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import * as lock from "@/lib/appLock";
import { checkPersonalCode } from "@/app/(app)/configuracion/securityActions";
import { PERSONAL_CODE_LENGTH } from "@/lib/personalCode";
import { CodeInput } from "./ui/CodeInput";
import { Icon } from "./ui/Icon";

/** Snapshot de las preferencias del dispositivo — useSyncExternalStore en vez
 *  de useEffect+setState: evita el parpadeo de hidratación (SSR no tiene
 *  localStorage) sin disparar un re-render en cascada. */
function useLockSettings(): lock.LockSettings {
  return useSyncExternalStore(
    lock.subscribeToLockSettings,
    lock.getLockSettings,
    lock.getLockSettingsServerSnapshot,
  );
}

/** Re-bloqueo por inactividad DENTRO de la app.
 *
 *  Ojo con qué protege cada cosa: el código al iniciar sesión lo exige el
 *  proxy (lib/supabase/middleware.ts) y es lo que de verdad impide entrar.
 *  Esto de acá es la otra mitad: que quien tome el teléfono ya desbloqueado,
 *  con la sesión abierta, no siga viendo la app. Bloquea la INTERFAZ, no
 *  cifra — los datos que el servidor ya envió siguen en el payload de React
 *  aunque no se pinten.
 *
 *  El código que pide es el MISMO del servidor, no un PIN local aparte: antes
 *  había dos secretos distintos que recordar y el local se comparaba contra un
 *  hash en localStorage, así que se esquivaba desde las herramientas del
 *  navegador. */
export function AppLockGate({
  children,
  codeActive,
}: {
  children: React.ReactNode;
  /** Solo re-bloquea si el usuario tiene el código activo. Llega del servidor
   *  porque es estado de la cuenta, no del dispositivo. */
  codeActive: boolean;
}) {
  const settings = useLockSettings();
  const [sessionUnlocked, setSessionUnlocked] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingBiometric, setCheckingBiometric] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const locked = codeActive && !sessionUnlocked;
  const hasWebAuthn = biometricAvailable && settings.webauthnCredentialId !== null;

  useEffect(() => {
    if (!locked) return;
    let cancelled = false;
    lock.isPlatformAuthenticatorAvailable().then((available) => {
      if (!cancelled) setBiometricAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, [locked]);

  // Vuelve a bloquear al regresar de segundo plano si pasó el tiempo
  // configurado ("Inmediato" = siempre) — no hay temporizador corriendo en
  // primer plano, solo se compara al recuperar visibilidad.
  useEffect(() => {
    if (!codeActive) return;
    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        lock.markBackgroundedNow();
      } else if (document.visibilityState === "visible" && lock.hasExceededTimeout()) {
        setSessionUnlocked(false);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [codeActive]);

  const unlock = useCallback(() => {
    setSessionUnlocked(true);
    setError(null);
  }, []);

  function submitCode(fd: FormData) {
    const code = String(fd.get("code") ?? "");
    if (code.length < PERSONAL_CODE_LENGTH) return;
    setError(null);
    startTransition(async () => {
      const res = await checkPersonalCode(code);
      if (res.ok) unlock();
      else setError(res.error ?? "Código incorrecto.");
    });
  }

  async function tryBiometric() {
    setCheckingBiometric(true);
    setError(null);
    const ok = await lock.verifyBiometric();
    setCheckingBiometric(false);
    if (ok) unlock();
    else setError("No se pudo verificar. Usa tu código personal.");
  }

  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-[var(--color-bg)] p-6">
      <div className="w-full max-w-xs flex flex-col items-center gap-4 text-center">
        <div className="grid place-items-center size-16 rounded-pill bg-gradient-brand text-white">
          <Icon name="lock" size={28} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">Cachin&apos; está bloqueado</h1>
          <p className="text-sm text-muted mt-1">Ingresa tu código personal para continuar.</p>
        </div>

        <form ref={formRef} action={submitCode} className="w-full flex flex-col gap-3">
          <CodeInput
            name="code"
            autoFocus
            disabled={pending}
            onComplete={() => formRef.current?.requestSubmit()}
          />
          {error && (
            <p
              className="text-sm font-medium text-danger bg-tint-danger rounded-tile px-3 py-2"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-pill bg-primary text-white font-semibold cursor-pointer disabled:opacity-50"
          >
            Desbloquear
          </button>
        </form>

        {hasWebAuthn && (
          <button
            onClick={tryBiometric}
            disabled={checkingBiometric}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-fg cursor-pointer disabled:opacity-60"
          >
            <Icon name="fingerprint" size={16} />
            {checkingBiometric ? "Verificando…" : "Usar dato biométrico"}
          </button>
        )}
      </div>
    </div>
  );
}
