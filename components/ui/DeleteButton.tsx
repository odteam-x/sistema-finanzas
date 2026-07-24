"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Icon } from "./Icon";
import type { ActionResult } from "@/lib/actions-shared";

interface DeleteButtonProps {
  action: () => Promise<ActionResult>;
  title?: string;
  message?: string;
  label?: string;
}

/** Botón de eliminar con confirmación (acción destructiva). */
export function DeleteButton({
  action,
  title = "¿Eliminar?",
  message = "Esta acción no se puede deshacer.",
  label = "Eliminar",
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await action();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={label}
        className="grid place-items-center size-11 rounded-full text-muted hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
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
