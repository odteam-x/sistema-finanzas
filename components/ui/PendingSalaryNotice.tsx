import { Money } from "./Money";
import { Icon } from "./Icon";
import { ConfirmSalaryButton } from "./ConfirmSalaryButton";
import type { Salary } from "@/lib/types";

/** Aviso de sueldo pendiente de confirmar. Vivía dentro del hero
 *  "Disponible esta quincena", que se eliminó (R05) — pero el aviso en sí
 *  sigue haciendo falta: sin él, el ingreso auto-generado en la fecha de
 *  cobro se contaría aunque el dinero todavía no haya llegado. Ahora es una
 *  franja chica, no una tarjeta protagonista. */
export function PendingSalaryNotice({ salary }: { salary: Salary }) {
  return (
    <div className="bg-warning-soft border border-black/5 rounded-[var(--radius-glass-sm)] p-3.5 mb-4 flex items-center gap-3 flex-wrap">
      <Icon name="clock" size={18} className="text-warning shrink-0" />
      <p className="text-sm text-ink min-w-0 flex-1">
        <span className="font-semibold">
          ¿Ya te llegó tu pago de <Money value={Number(salary.amount)} decimals={false} />?
        </span>{" "}
        <span className="text-muted">No cuenta en tu balance hasta que lo confirmes.</span>
      </p>
      <ConfirmSalaryButton salaryId={salary.id} compact />
    </div>
  );
}
