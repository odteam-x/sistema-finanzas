"use client";

import { useTransition } from "react";
import { Icon } from "./Icon";
import { confirmSalary } from "@/app/(app)/ingresos/actions";

/** Botón "Confirmar" para un ingreso auto-generado que aún no se sabe si
 *  llegó de verdad (ver runSalaryCatchUp en lib/salary.ts). Recién al
 *  confirmar se acredita al ledger y empieza a contar en "Disponible". */
export function ConfirmSalaryButton({
  salaryId,
  full,
  compact,
}: {
  salaryId: string;
  full?: boolean;
  /** Chip chico (para filas de lista) en vez de la píldora blanca grande
   *  del hero. */
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await confirmSalary(salaryId);
    });
  }

  const spinner = <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />;

  if (compact) {
    return (
      <button
        onClick={confirm}
        disabled={pending}
        className="inline-flex items-center justify-center gap-1 min-h-8 rounded-full bg-primary-soft text-primary font-semibold text-xs px-3 cursor-pointer transition-colors hover:bg-primary/15 disabled:opacity-60 active:scale-[0.97] shrink-0"
      >
        {pending ? spinner : <Icon name="check" size={14} />}
        {pending ? "…" : "Confirmar"}
      </button>
    );
  }

  return (
    <button
      onClick={confirm}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-1.5 min-h-10 rounded-full bg-white text-primary font-bold text-sm px-4 cursor-pointer transition-colors hover:bg-white/90 disabled:opacity-60 active:scale-[0.97] ${full ? "w-full" : ""}`}
    >
      {pending ? spinner : <Icon name="check" size={17} />}
      {pending ? "Confirmando…" : "Sí, ya me llegó"}
    </button>
  );
}
