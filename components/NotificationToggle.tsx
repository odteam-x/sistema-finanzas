"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { subscribeToPush, hasActivePushSubscription, isIosNotInstalled } from "@/lib/pushClient";

type Permission = NotificationPermission | "unsupported";

function currentPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

const LABEL: Record<Permission, string> = {
  granted: "Activados",
  denied: "Bloqueados",
  default: "Desactivados",
  unsupported: "No disponible",
};

/** Fila de Configuración para pedir permiso de notificaciones — locales
 *  (vencimientos, día de cobro — ver NotificationTrigger.tsx, solo disparan
 *  con la app abierta) Y push reales (Bloque 12: presupuesto que cruza el
 *  límite, avisos programados — ver lib/webpush.ts, llegan con la app
 *  cerrada). No pide el permiso solo al cargar la página (mala práctica):
 *  solo al tocar esta fila, con el usuario a cargo. */
export function NotificationToggle() {
  const [permission, setPermission] = useState<Permission>(() => currentPermission());
  const [pushReady, setPushReady] = useState(false);

  // Genuinamente async (Service Worker API) — no una lectura síncrona.
  useEffect(() => {
    if (permission !== "granted") return;
    let cancelled = false;
    hasActivePushSubscription().then((has) => {
      if (!cancelled) setPushReady(has);
    });
    return () => {
      cancelled = true;
    };
  }, [permission]);

  async function request() {
    if (permission !== "default") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      const ok = await subscribeToPush();
      setPushReady(ok);
    }
  }

  return (
    <div>
      <button
        onClick={request}
        disabled={permission !== "default"}
        className="flex w-full items-center justify-between gap-3 min-h-11 cursor-pointer text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <Icon name="bell" size={18} className="text-muted" />
          Recordatorios
        </span>
        <span className="flex items-center gap-1 text-sm text-muted">
          {LABEL[permission]}
          {permission === "default" && <Icon name="chevronRight" size={16} />}
        </span>
      </button>
      {permission === "granted" && isIosNotInstalled() && (
        <p className="text-xs text-warning mt-1">
          En iPhone, los avisos solo llegan si agregas Cachin&apos; a tu pantalla de inicio (Compartir → Agregar a
          inicio) — abierta solo en Safari no los recibirás con la app cerrada.
        </p>
      )}
      {permission === "granted" && !pushReady && (
        <button
          onClick={async () => setPushReady(await subscribeToPush())}
          className="text-xs font-semibold text-primary-fg mt-1 cursor-pointer"
        >
          Reintentar activar avisos con la app cerrada
        </button>
      )}
    </div>
  );
}
