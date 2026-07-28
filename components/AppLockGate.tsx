"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import * as lock from "@/lib/appLock";
import { Icon } from "./ui/Icon";

/** Snapshot del bloqueo (activo o no) — useSyncExternalStore en vez de
 *  useEffect+setState: evita el parpadeo de hidratación (SSR no tiene
 *  localStorage) sin disparar un re-render en cascada, mismo patrón que
 *  OfflineBanner.tsx en este proyecto. lib/appLock.ts cachea la referencia
 *  del objeto para que el snapshot sea estable entre renders. */
function useLockSettings(): lock.LockSettings {
  return useSyncExternalStore(lock.subscribeToLockSettings, lock.getLockSettings, lock.getLockSettingsServerSnapshot);
}

/** Pantalla de bloqueo local (Bloque 11) — envuelve TODO el contenido
 *  autenticado.
 *
 *  Aclaración honesta: esto bloquea la INTERFAZ (evita que alguien que tome
 *  el teléfono desbloqueado vea u opere la app), no es cifrado — los datos
 *  que el servidor ya envió en esta carga de página siguen técnicamente en
 *  el payload de React aunque no se pinten. Ese es el modelo que se aprobó
 *  para este bloque (ver PLAN.md, Fase 7): TLS + cifrado en reposo de
 *  Supabase para el transporte/almacenamiento, este bloqueo para el acceso
 *  casual al dispositivo. */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const settings = useLockSettings();
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pin, setPinInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingBiometric, setCheckingBiometric] = useState(false);

  const locked = settings.enabled && !sessionUnlocked;
  const hasWebAuthn = biometricAvailable && settings.webauthnCredentialId !== null;

  // Disponibilidad de biometría: genuinamente async (API del navegador), no
  // una lectura síncrona de localStorage — llamar setState en el .then()
  // no dispara el aviso de "setState síncrono en efecto".
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
    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        lock.markBackgroundedNow();
      } else if (document.visibilityState === "visible" && lock.isLockEnabled() && lock.hasExceededTimeout()) {
        setSessionUnlocked(false);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const unlock = useCallback(() => {
    setSessionUnlocked(true);
    setPinInput("");
    setError(null);
  }, []);

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) return;
    const ok = await lock.verifyPin(pin);
    if (ok) unlock();
    else {
      setError("PIN incorrecto.");
      setPinInput("");
    }
  }

  async function tryBiometric() {
    setCheckingBiometric(true);
    setError(null);
    const ok = await lock.verifyBiometric();
    setCheckingBiometric(false);
    if (ok) unlock();
    else setError("No se pudo verificar. Usa tu PIN.");
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
          <p className="text-sm text-muted mt-1">Ingresa tu PIN para continuar.</p>
        </div>

        <form onSubmit={submitPin} className="w-full flex flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setError(null);
              setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
            }}
            className="w-full text-center text-2xl tracking-[0.5em] rounded-tile border border-[var(--input-border)] bg-[var(--input-bg)] py-3 text-ink"
            placeholder="••••"
          />
          {error && (
            <p className="text-sm font-medium text-danger bg-tint-expense rounded-tile px-3 py-2" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pin.length < 4}
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
            {checkingBiometric ? "Verificando…" : "Usar Face ID / Touch ID / Windows Hello"}
          </button>
        )}
      </div>
    </div>
  );
}
