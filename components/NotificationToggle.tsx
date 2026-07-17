"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

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

/** Fila de Configuración para pedir permiso de notificaciones locales
 *  (vencimientos, día de cobro, presupuesto cerca del límite — ver
 *  NotificationTrigger.tsx). No pide el permiso solo al cargar la página
 *  (mala práctica): solo al tocar esta fila, con el usuario a cargo. */
export function NotificationToggle() {
  const [permission, setPermission] = useState<Permission>(() => currentPermission());

  async function request() {
    if (permission !== "default") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <button
      onClick={request}
      disabled={permission !== "default"}
      className="flex w-full items-center justify-between gap-3 py-1 cursor-pointer text-left disabled:cursor-default"
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
  );
}
