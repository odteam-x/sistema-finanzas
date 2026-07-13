"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import type { ActionResult } from "@/lib/actions-shared";

interface FormModalProps {
  title: string;
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel?: string;
  triggerLabel?: string;
  triggerIcon?: IconName;
  triggerVariant?: "primary" | "secondary";
  triggerFull?: boolean;
  /** Trigger personalizado (recibe la función para abrir el modal). */
  renderTrigger?: (open: () => void) => React.ReactNode;
}

export function FormModal({
  title,
  action,
  children,
  submitLabel = "Guardar",
  triggerLabel,
  triggerIcon = "plus",
  triggerVariant = "primary",
  triggerFull,
  renderTrigger,
}: FormModalProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openModal() {
    setError(null);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(formData);
      if (res?.ok) {
        setOpen(false);
      } else {
        setError(res?.error ?? "Ocurrió un error. Intenta de nuevo.");
      }
    });
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openModal)
      ) : (
        <Button
          variant={triggerVariant}
          onClick={openModal}
          full={triggerFull}
          size="md"
        >
          <Icon name={triggerIcon} size={18} />
          {triggerLabel}
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {children}

          {error && (
            <p
              className="text-sm font-medium text-danger bg-danger-soft rounded-2xl px-3 py-2 flex items-center gap-2"
              role="alert"
            >
              <Icon name="alert" size={18} />
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              full
            >
              Cancelar
            </Button>
            <Button type="submit" loading={pending} full>
              {submitLabel}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
