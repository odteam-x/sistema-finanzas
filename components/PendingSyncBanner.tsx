"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as queue from "@/lib/offlineQueue";
import { Icon } from "@/components/ui/Icon";

/** useSyncExternalStore, no useEffect+setState — mismo patrón que
 *  lib/appLock.ts (Bloque 11): snapshot estable, sin parpadeo de
 *  hidratación. El contador se actualiza solo: cada vez que flushQueue()
 *  saca un ítem de la cola, lib/offlineQueue.ts avisa a los suscriptores. */
function usePendingQueue(): queue.QueuedItem[] {
  return useSyncExternalStore(queue.subscribeToQueue, queue.getQueue, queue.getQueueServerSnapshot);
}

/** Franja para los pendientes de sincronizar (Bloque 12: cola offline-first
 *  de Gasto/Ingreso/Movimiento del FAB, ver lib/offlineQueue.ts). Reintenta
 *  al montar (por si quedaron pendientes de una sesión anterior que ya tiene
 *  señal) y al recuperar conexión — nunca en un temporizador, para no
 *  golpear la red en loop mientras sigue sin conexión. */
export function PendingSyncBanner() {
  const pending = usePendingQueue();

  useEffect(() => {
    function tryFlush() {
      if (queue.getQueue().length === 0) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      queue.flushQueue();
    }
    tryFlush();
    window.addEventListener("online", tryFlush);
    return () => window.removeEventListener("online", tryFlush);
  }, []);

  if (pending.length === 0) return null;

  return (
    <div className="bg-primary text-white text-xs font-semibold text-center py-1.5 px-3 flex items-center justify-center gap-1.5">
      <Icon name="repeat" size={13} />
      {pending.length} {pending.length === 1 ? "cambio pendiente" : "cambios pendientes"} de sincronizar
    </div>
  );
}
