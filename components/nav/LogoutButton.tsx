"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { clearUserStorage, getActiveUser } from "@/lib/storageKey";
import { getQueue } from "@/lib/offlineQueue";

/** Cierra sesión y deja el dispositivo limpio para quien entre después.
 *
 *  Antes solo llamaba a signOut(): todo el localStorage se quedaba, así que la
 *  siguiente persona heredaba la cuenta preferida, los consejos ya vistos, los
 *  ajustes de bloqueo y —lo grave— la cola de pendientes con dinero sin enviar.
 */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [pendientes, setPendientes] = useState<number | null>(null);

  async function salir() {
    setLoading(true);
    try {
      // Se limpia ANTES de signOut(): después ya no se sabe qué usuario era, y
      // sus claves quedarían huérfanas en el aparato para siempre.
      const id = getActiveUser();
      if (id) clearUserStorage(id);
      await createClient().auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  function intentarSalir() {
    // Lo que hay en la cola es dinero anotado que todavía no llegó al
    // servidor. Cerrar sesión lo borra, así que se avisa y se deja decidir —
    // descartarlo en silencio sería perder registros que el usuario cree
    // guardados.
    const n = getQueue().length;
    if (n > 0) {
      setPendientes(n);
      return;
    }
    void salir();
  }

  return (
    <>
      <button
        onClick={intentarSalir}
        disabled={loading}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-tile text-sm font-semibold text-muted hover:bg-surface-sunken transition-colors cursor-pointer disabled:opacity-50"
      >
        <Icon name="logout" size={19} />
        Cerrar sesión
      </button>

      <Modal
        open={pendientes !== null}
        onClose={() => setPendientes(null)}
        title="Tienes registros sin enviar"
        compact
      >
        <p className="text-sm text-muted -mt-1">
          {pendientes === 1
            ? "Hay 1 registro que anotaste sin conexión y todavía no llegó al servidor."
            : `Hay ${pendientes} registros que anotaste sin conexión y todavía no llegaron al servidor.`}{" "}
          Si cierras sesión ahora se pierden.
        </p>
        <p className="text-sm font-semibold text-danger mt-2">Esto no se puede deshacer.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setPendientes(null)} full>
            Volver
          </Button>
          <Button variant="danger" onClick={salir} loading={loading} full>
            Cerrar sesión
          </Button>
        </div>
      </Modal>
    </>
  );
}
