// Fuente ÚNICA del cálculo de un cobro/préstamo (total / cobrado /
// pendiente). Espejo de lib/debts.ts — misma mecánica, signo contrario:
// una deuda es dinero que sale al pagarla, un cobro es dinero que entra
// al recibirlo.
import type { Receivable, ReceivableInstallment } from "./types";

/** Cuánto te han pagado ya de este cobro. */
export function collectedOf(
  r: Receivable,
  installments: ReceivableInstallment[],
): number {
  if (r.payment_type === "cuotas") {
    return installments
      .filter((i) => i.receivable_id === r.id && i.paid)
      .reduce((s, i) => s + Number(i.amount), 0);
  }
  return r.status === "cobrada" ? Number(r.total_amount) : 0;
}

/** Cuánto falta por cobrar. Nunca negativo. */
export function pendingOf(
  r: Receivable,
  installments: ReceivableInstallment[],
): number {
  return Math.max(0, Number(r.total_amount) - collectedOf(r, installments));
}

/** Ya no queda nada por cobrar. */
export function isCollected(
  r: Receivable,
  installments: ReceivableInstallment[],
): boolean {
  return pendingOf(r, installments) <= 0;
}

/** Total pendiente de todos los cobros/préstamos (o solo de un tipo). */
export function totalPending(
  receivables: Receivable[],
  installments: ReceivableInstallment[],
  kind?: Receivable["kind"],
): number {
  return receivables
    .filter((r) => !kind || r.kind === kind)
    .reduce((s, r) => s + pendingOf(r, installments), 0);
}
