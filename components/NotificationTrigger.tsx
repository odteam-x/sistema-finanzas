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
 *  permiso (ver NotificationToggle.tsx en Configuración).
 *
 *  Va por el SERVICE WORKER y no por `new Notification(...)`, que es lo que
 *  había: iOS no implementa el constructor `Notification` ni siquiera dentro
 *  de una PWA instalada, así que la llamada no lanzaba error — simplemente no
 *  aparecía nada. En iPhone estos recordatorios llevaban sin funcionar desde
 *  el primer día, en silencio.
 *
 *  `showNotification()` sobre el registro del service worker es la única API
 *  que Safari soporta, y funciona igual en Android y escritorio, así que no
 *  hay que ramificar por plataforma. */
export function NotificationTrigger({ candidates }: { candidates: NotificationCandidate[] }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "granted") return;

    let cancelado = false;

    (async () => {
      const registration = await navigator.serviceWorker.ready;
      if (cancelado) return;

      for (const c of candidates) {
        const seenKey = `cachin:notif:${c.key}`;
        if (localStorage.getItem(seenKey)) continue;
        // Se marca ANTES de mostrar: si showNotification falla, es preferible
        // perder un aviso a repetirlo en cada carga de la pantalla.
        localStorage.setItem(seenKey, "1");
        await registration.showNotification(c.title, {
          body: c.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          // Mismo dato que espera el `notificationclick` del sw.js, para que
          // tocar el aviso lleve al Inicio en vez de abrir una pestaña suelta.
          data: { url: "/dashboard" },
        });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [candidates]);

  return null;
}
