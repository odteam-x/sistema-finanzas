"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/actions-shared";

type TriggerStyle = "button" | "icon" | "link" | "pill";

interface FormModalProps {
  title: string;
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel?: string;
  /** Estilo del botón que abre el modal (todo serializable, sin funciones). */
  trigger?: TriggerStyle;
  triggerLabel?: string;
  triggerIcon?: IconName;
  triggerVariant?: "primary" | "secondary";
  triggerAriaLabel?: string;
  triggerFull?: boolean;
}

export function FormModal({
  title,
  action,
  children,
  submitLabel = "Guardar",
  trigger = "button",
  triggerLabel,
  triggerIcon = "plus",
  triggerVariant = "primary",
  triggerAriaLabel,
  triggerFull,
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
      {trigger === "button" && (
        <Button variant={triggerVariant} onClick={openModal} full={triggerFull} size="md">
          <Icon name={triggerIcon} size={18} />
          {triggerLabel}
        </Button>
      )}

      {trigger === "icon" && (
        <button
          onClick={openModal}
          aria-label={triggerAriaLabel ?? triggerLabel ?? "Abrir"}
          className="grid place-items-center size-9 rounded-full text-muted hover:bg-black/5 cursor-pointer shrink-0"
        >
          <Icon name={triggerIcon} size={18} />
        </button>
      )}

      {trigger === "link" && (
        <button
          onClick={openModal}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover cursor-pointer"
        >
          <Icon name={triggerIcon} size={16} />
          {triggerLabel}
        </button>
      )}

      {trigger === "pill" && (
        <button
          onClick={openModal}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 min-h-9 rounded-full bg-primary-soft text-primary font-semibold text-sm hover:bg-primary/15 cursor-pointer",
            triggerFull ? "w-full" : "flex-1",
          )}
        >
          <Icon name={triggerIcon} size={16} />
          {triggerLabel}
        </button>
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
