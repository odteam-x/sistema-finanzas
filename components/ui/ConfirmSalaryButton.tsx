"use client";

import { useTransition } from "react";
import { Icon } from "./Icon";
import { confirmSalary } from "@/app/(app)/ingresos/actions";

/** Botón "Confirmar" para un ingreso auto-generado que aún no se sabe si
 *  llegó de verdad (ver runSalaryCatchUp en lib/salary.ts). Recién al
 *  confirmar se acredita al ledger y empieza a contar en "Disponible".
 *
 *  Tenía una segunda variante (píldora blanca grande, para el hero
 *  "Disponible esta quincena") que quedó huérfana cuando ese hero se
 *  eliminó: los dos sitios que lo usan pasan `compact`. Se quitó junto con
 *  su `bg-white` fijo, que en modo oscuro era un botón blanco puro. */
export function ConfirmSalaryButton({ salaryId }: { salaryId: string }) {
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await confirmSalary(salaryId);
    });
  }

  return (
    <button
      onClick={confirm}
      disabled={pending}
      className="inline-flex items-center justify-center gap-1 min-h-11 rounded-pill bg-primary-soft text-primary-fg font-semibold text-xs px-3.5 cursor-pointer transition-colors hover:bg-primary hover:text-on-brand disabled:opacity-60 active:scale-[0.97] shrink-0"
    >
      {pending ? (
        <span className="size-4 rounded-pill border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <Icon name="check" size={14} />
      )}
      {pending ? "…" : "Confirmar"}
    </button>
  );
}
