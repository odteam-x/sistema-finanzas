"use client";

import { useEffect } from "react";

export interface NotificationCandidate {
  /** Estable por tipo+fecha — se usa para no repetir el mismo aviso el
   *  mismo día aunque se abra la app varias veces. */
  key: string;
  title: string;
  body: string;
}

/** Dispara recordatorios locales al abrir el Inicio, si el usuario ya dio
 *  permiso (ver NotificationToggle.tsx en Configuración). Sin servidor de
 *  push no hay forma de avisar con la app cerrada — esto cubre el caso
 *  real de uso: revisar al entrar a la app, no en segundo plano. */
export function NotificationTrigger({ candidates }: { candidates: NotificationCandidate[] }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    for (const c of candidates) {
      const seenKey = `cachin:notif:${c.key}`;
      if (localStorage.getItem(seenKey)) continue;
      localStorage.setItem(seenKey, "1");
      new Notification(c.title, { body: c.body, icon: "/icons/icon-192.png" });
    }
  }, [candidates]);

  return null;
}
