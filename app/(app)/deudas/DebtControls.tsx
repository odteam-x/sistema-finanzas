"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { formatDateShort } from "@/lib/format";
import { Money } from "@/components/ui/Money";
import type { DebtInstallment } from "@/lib/types";
import { toggleInstallment, toggleDebtPaid } from "./actions";

/** Fila de una cuota con checkbox para marcar pagada. */
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
    <button
      onClick={toggle}
      disabled={pending}
      className="flex items-center gap-2.5 w-full py-1.5 text-left cursor-pointer disabled:opacity-60"
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
      <span className="text-sm text-ink flex-1">
        Cuota {i.seq}
        <span className="text-muted"> · {formatDateShort(i.due_date)}</span>
      </span>
      {!i.paid && overdue && (
        <span className="text-[0.7rem] font-bold text-danger">vencida</span>
      )}
      <span
        className={cn(
          "text-sm font-semibold",
          i.paid ? "text-muted line-through" : "text-ink",
        )}
      >
        <Money value={Number(i.amount)} />
      </span>
    </button>
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
