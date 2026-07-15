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
  triggerTone?: "solid" | "ghost";
  triggerAriaLabel?: string;
  triggerFull?: boolean;
  /** Oculta el botón disparador propio — para cuando otro elemento (ej. un
   *  ítem de una hoja de acciones) decide cuándo abrir el modal. */
  hideTrigger?: boolean;
  /** Estado controlado desde fuera (junto a onOpenChange). Si se omite,
   *  el modal maneja su propio estado interno como siempre. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  triggerTone = "solid",
  triggerAriaLabel,
  triggerFull,
  hideTrigger,
  open: controlledOpen,
  onOpenChange,
}: FormModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

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
      {!hideTrigger && trigger === "button" && (
        <Button variant={triggerVariant} onClick={openModal} full={triggerFull} size="md">
          <Icon name={triggerIcon} size={18} />
          {triggerLabel}
        </Button>
      )}

      {!hideTrigger && trigger === "icon" && (
        <button
          onClick={openModal}
          aria-label={triggerAriaLabel ?? triggerLabel ?? "Abrir"}
          className="grid place-items-center size-9 rounded-full text-muted hover:bg-black/5 cursor-pointer shrink-0"
        >
          <Icon name={triggerIcon} size={18} />
        </button>
      )}

      {!hideTrigger && trigger === "link" && (
        <button
          onClick={openModal}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover cursor-pointer"
        >
          <Icon name={triggerIcon} size={16} />
          {triggerLabel}
        </button>
      )}

      {!hideTrigger && trigger === "pill" && (
        <button
          onClick={openModal}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 min-h-9 rounded-full font-semibold text-sm cursor-pointer transition-colors active:scale-[0.97]",
            triggerTone === "ghost"
              ? "border border-black/10 text-ink hover:bg-black/5"
              : "bg-primary-soft text-primary hover:bg-primary/15",
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
