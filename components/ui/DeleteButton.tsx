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

  function confirm() {
    startTransition(async () => {
      const res = await action();
      setOpen(false);
      if (!res?.ok) {
        toast.show(res?.error ?? "No se pudo eliminar.");
        return;
      }
      const token = res.undo;
      toast.show(
        successMessage,
        token && undoAction ? () => undoAction(token).then(() => {}) : undefined,
      );
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={label}
        className="grid place-items-center size-11 rounded-pill text-muted hover:text-danger hover:bg-tint-expense transition-colors cursor-pointer"
      >
        <Icon name="trash" size={18} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-sm text-muted -mt-1">{message}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} full>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} loading={pending} full>
            {label}
          </Button>
        </div>
      </Modal>
    </>
  );
}
