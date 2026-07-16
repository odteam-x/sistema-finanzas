"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { formatDateShort } from "@/lib/format";
import { Money } from "@/components/ui/Money";
import type { DebtInstallment } from "@/lib/types";
import { toggleInstallment, toggleDebtPaid, updateInstallment } from "./actions";

/** Fila de una cuota con checkbox para marcar pagada, y un ícono para
 *  editar monto/fecha (sumar cantidad o aplazar) mientras no esté pagada. */
export function InstallmentRow({
  installment,
  overdue,
}: {
  installment: DebtInstallment;
  overdue: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const i = installment;

  function toggle() {
    startTransition(() => {
      toggleInstallment(i.id, i.debt_id, !i.paid).then(() => {});
    });
  }

  return (
    <div className="flex items-center gap-1.5 py-1">
      <button
        onClick={toggle}
        disabled={pending}
        className="flex items-center gap-2.5 flex-1 min-w-0 py-0.5 text-left cursor-pointer disabled:opacity-60"
      >
        <span
          className={cn(
            "grid place-items-center size-6 rounded-md border-2 shrink-0 transition-colors",
            i.paid
              ? "bg-primary border-primary text-white"
              : "border-black/20 text-transparent",
          )}
        >
          <Icon name="check" size={14} />
        </span>
        <span className="text-sm text-ink flex-1 min-w-0">
          Cuota {i.seq}
          <span className="text-muted"> · {formatDateShort(i.due_date)}</span>
        </span>
        {!i.paid && overdue && (
          <span className="text-[0.7rem] font-bold text-danger shrink-0">vencida</span>
        )}
        <span
          className={cn(
            "text-sm font-semibold shrink-0",
            i.paid ? "text-muted line-through" : "text-ink",
          )}
        >
          <Money value={Number(i.amount)} />
        </span>
      </button>
      {!i.paid && (
        <FormModal
          title="Editar cuota"
          action={updateInstallment}
          submitLabel="Guardar"
          trigger="icon"
          triggerIcon="edit"
          triggerAriaLabel={`Editar cuota ${i.seq}`}
        >
          <input type="hidden" name="id" value={i.id} />
          <Field label="Monto" htmlFor={`ci-amt-${i.id}`} required hint="Súmale si aumentó.">
            <MoneyInput id={`ci-amt-${i.id}`} name="amount" defaultValue={String(i.amount)} required />
          </Field>
          <Field label="Fecha de vencimiento" htmlFor={`ci-date-${i.id}`} required hint="Aplázala si necesitas más tiempo.">
            <Input id={`ci-date-${i.id}`} name="due_date" type="date" defaultValue={i.due_date} required />
          </Field>
        </FormModal>
      )}
    </div>
  );
}

/** Toggle de pago para deudas de pago único — mismo checkbox que las
 *  cuotas, en vez de un botón primario que competía visualmente con
 *  "Registrar deuda" como si fuera la acción principal de la pantalla. */
export function DebtPaidToggle({
  id,
  paid,
}: {
  id: string;
  paid: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => toggleDebtPaid(id, !paid).then(() => {}))}
      disabled={pending}
      className="flex items-center gap-2.5 w-full py-1 text-left cursor-pointer disabled:opacity-60"
    >
      <span
        className={cn(
          "grid place-items-center size-6 rounded-md border-2 shrink-0 transition-colors",
          paid ? "bg-primary border-primary text-white" : "border-black/20 text-transparent",
        )}
      >
        <Icon name="check" size={14} />
      </span>
      <span className={cn("text-sm flex-1", paid ? "text-muted line-through" : "text-ink")}>
        {paid ? "Pagada" : "Marcar pagada"}
      </span>
    </button>
  );
}
