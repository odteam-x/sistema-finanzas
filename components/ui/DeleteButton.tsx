"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import type { ActionResult } from "@/lib/actions-shared";
import type { UndoToken } from "@/lib/softDelete";

interface DeleteButtonProps {
  action: () => Promise<ActionResult & { undo?: UndoToken }>;
  /** Deshacer el borrado (restaura la fila). Si se omite, el aviso sale sin
   *  botón de deshacer — para lo que de verdad no se revierte. */
  undoAction?: (token: UndoToken) => Promise<ActionResult>;
  title?: string;
  /** Qué va a pasar, en concreto. Ej.: "Esto eliminará el gasto de RD$500
   *  del 15 jul y devolverá ese monto a Efectivo." */
  message?: string;
  label?: string;
  /** Texto del aviso tras eliminar. */
  successMessage?: string;
}

/** Botón de eliminar con confirmación que explica el impacto concreto, y
 *  aviso posterior con "Deshacer" (~8 s). El borrado es suave: la fila se
 *  marca como eliminada, no se destruye, así deshacer es instantáneo y no
 *  hay que reconstruir nada (ver lib/softDelete.ts). */
export function DeleteButton({
  action,
  undoAction,
  title = "¿Eliminar?",
  message = "Se quitará de tus registros. Podrás deshacerlo enseguida.",
  label = "Eliminar",
  successMessage = "Eliminado",
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  // Se puede deshacer si quien lo usa pasó cómo hacerlo. No hace falta una
  // prop nueva: la reversibilidad ya estaba declarada en cada sitio, solo que
  // la confirmación no la miraba.
  const reversible = Boolean(undoAction);

  function confirm() {
    startTransition(async () => {
      const res = await action();
      setOpen(false);
      if (!res?.ok) {
        toast.show(res?.error ?? "No se pudo eliminar.");
        return;
      }
      const token = res.undo;
      // Se devuelve el ActionResult en vez de tragárselo con `.then(() => {})`:
      // restaurar puede fallar de verdad (una etiqueta cuyo nombre ya volvió a
      // ocuparse choca contra el índice único de migration-v29), y el Toast
      // necesita el resultado para avisar en lugar de cerrarse como si todo
      // hubiera ido bien.
      toast.show(successMessage, token && undoAction ? () => undoAction(token) : undefined);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={label}
        className="grid place-items-center size-11 rounded-pill text-muted hover:text-danger hover:bg-tint-expense transition-colors cursor-pointer active:scale-[0.97]"
      >
        <Icon name="trash" size={18} />
      </button>

      {/* CONFIRMACIÓN PROPORCIONAL. Antes las diecinueve confirmaciones de la
          app tenían exactamente el mismo peso: el mismo modal, el mismo botón
          rojo de alarma. Eliminar una etiqueta —que se restaura de un toque—
          pedía lo mismo que eliminar una deuda con todas sus cuotas.

          Cuando todo grita igual, nada avisa: se aprende a tocar "Eliminar"
          sin leer, y entonces la confirmación no protege de nada justo el día
          que hace falta.

          La diferencia ya estaba en los datos y no se usaba: `undoAction` es
          exactamente la señal de si esto se puede deshacer. Con deshacer, el
          botón va en primario y el texto lo dice; sin deshacer, se queda el
          rojo y la advertencia de que es definitivo. */}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-sm text-muted -mt-1">{message}</p>
        {!reversible && (
          <p className="text-sm font-semibold text-danger mt-2">Esto no se puede deshacer.</p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} full>
            Cancelar
          </Button>
          <Button
            variant={reversible ? "primary" : "danger"}
            onClick={confirm}
            loading={pending}
            full
          >
            {label}
          </Button>
        </div>
      </Modal>
    </>
  );
}
