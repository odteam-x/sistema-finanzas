"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Receipt, type ReceiptData } from "./Receipt";
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
  /** Si se pasa, al guardar con éxito el modal NO se cierra: cambia su
   *  contenido por un recibo construido con el FormData que se acaba de
   *  enviar. `queued` indica que la acción se encoló sin conexión en vez de
   *  llegar al servidor. Se recibe ya resuelto para no duplicar aquí la
   *  detección de red. */
  receipt?: (formData: FormData, queued: boolean) => ReceiptData;
  /** Pone el cursor en el primer campo al abrir, en vez de en la X. Ver Modal. */
  focusFirstField?: boolean;
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
  receipt,
  focusFirstField,
}: FormModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ReceiptData | null>(null);
  const [pending, startTransition] = useTransition();
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  function openModal() {
    setError(null);
    setDone(null);
    setOpen(true);
  }

  /** Cierra y limpia el recibo, para que la próxima apertura muestre el
   *  formulario y no la confirmación anterior. */
  function close() {
    setOpen(false);
    setDone(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Se lee ANTES de enviar: submitOfflineAware devuelve `ok: true` tanto
    // si guardó como si encoló, así que después ya no hay forma de
    // distinguirlo — y un recibo que diga "listo" sobre algo que sigue en
    // la cola sería mentira.
    const queued = typeof navigator !== "undefined" && navigator.onLine === false;
    startTransition(async () => {
      const res = await action(formData);
      if (!res?.ok) {
        setError(res?.error ?? "Ocurrió un error. Intenta de nuevo.");
        return;
      }
      if (receipt) setDone(receipt(formData, queued));
      else setOpen(false);
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
          className="grid place-items-center size-11 rounded-pill text-muted hover:bg-surface-sunken cursor-pointer shrink-0"
        >
          <Icon name={triggerIcon} size={18} />
        </button>
      )}

      {!hideTrigger && trigger === "link" && (
        <button
          onClick={openModal}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-fg hover:text-primary-fg cursor-pointer"
        >
          <Icon name={triggerIcon} size={16} />
          {triggerLabel}
        </button>
      )}

      {!hideTrigger && trigger === "pill" && (
        <button
          onClick={openModal}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 min-h-11 rounded-pill font-semibold text-sm cursor-pointer transition-colors active:scale-[0.97]",
            triggerTone === "ghost"
              ? "border border-line-strong text-ink hover:bg-surface-sunken"
              : "bg-primary-soft text-primary-fg hover:bg-primary-soft",
            triggerFull ? "w-full" : "flex-1",
          )}
        >
          <Icon name={triggerIcon} size={16} />
          {triggerLabel}
        </button>
      )}

      {/* El recibo reemplaza el contenido del MISMO modal: no hay una
          segunda capa que abrir ni un cierre-y-reapertura que se vea como
          un parpadeo. */}
      {/* `&& !done`: cuando el modal ya muestra el recibo no queda campo que
          enfocar, y robarle el foco a la nada dejaría el lector de pantalla
          sin punto de partida. */}
      <Modal
        open={open}
        onClose={close}
        title={done ? done.title : title}
        focusFirstField={focusFirstField && !done}
      >
        {done ? (
          <Receipt data={done} onDone={close} />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {children}

            {error && (
              <p
                className="text-sm font-medium text-danger bg-tint-expense rounded-tile px-3 py-2 flex items-center gap-2"
                role="alert"
              >
                <Icon name="alert" size={18} />
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={close} full>
                Cancelar
              </Button>
              <Button type="submit" loading={pending} full>
                {submitLabel}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
