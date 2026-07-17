"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Franja fija cuando no hay conexión — las pantallas ya visitadas se
 *  siguen viendo (el service worker las cachea, ver public/sw.js), pero con
 *  los últimos datos que se sincronizaron, no en vivo. Crear/editar sigue
 *  sin funcionar sin red (eso no es parte de este alcance). */
export function OfflineBanner() {
  // useSyncExternalStore: la forma correcta de leer una API del navegador
  // (navigator.onLine) sin caer en setState-dentro-de-effect — mismo
  // patrón que el saludo por hora en GreetingHero.tsx. Snapshot de
  // servidor "online" (el SSR no tiene navigator), se corrige en el
  // primer render del cliente si ya está offline.
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-warning text-white text-xs font-semibold text-center py-1.5 px-3 flex items-center justify-center gap-1.5">
      <Icon name="alert" size={13} />
      Sin conexión · viendo tu última sincronización
    </div>
  );
}
