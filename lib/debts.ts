// Fuente ÚNICA del cálculo de una deuda (total / abonado / pendiente).
//
// Mismo criterio que lib/balances.ts: antes cada pantalla sumaba las cuotas
// por su cuenta (deudas/page.tsx y lib/summary.ts con lógicas parecidas pero
// escritas aparte). Al agregar los incrementos (R02) eso se habría
// desincronizado — una pantalla mostrando el monto original y otra el nuevo.
import type { Debt, DebtIncrement, DebtInstallment } from "./types";

/** Monto total real: lo que se debía al inicio más cada aumento posterior.
 *  Los incrementos NO mueven dinero — deber más no es gastar (R01). */
export function totalOfDebt(debt: Debt, increments: DebtIncrement[]): number {
  const extra = increments
    .filter((i) => i.debt_id === debt.id)
    .reduce((s, i) => s + Number(i.amount), 0);
  return Number(debt.total_amount) + extra;
}

/** Cuánto se ha abonado ya. En cuotas sale de las cuotas marcadas pagadas;
 *  en pago único es todo o nada según el estado. */
export function paidOfDebt(debt: Debt, installments: DebtInstallment[]): number {
  if (debt.payment_type === "cuotas") {
    return installments
      .filter((i) => i.debt_id === debt.id && i.paid)
      .reduce((s, i) => s + Number(i.amount), 0);
  }
  return debt.status === "pagada" ? Number(debt.total_amount) : 0;
}

/** Lo que falta por pagar. Nunca negativo. */
export function outstandingOfDebt(
  debt: Debt,
  installments: DebtInstallment[],
  increments: DebtIncrement[],
): number {
  return Math.max(0, totalOfDebt(debt, increments) - paidOfDebt(debt, installments));
}

/** Una deuda está liquidada cuando ya no queda nada por pagar. Es la
 *  condición que la vuelve inmutable (R03) — se calcula, no se confía en
 *  `status` a secas, porque un incremento puede reabrirla de hecho. */
export function isSettled(
  debt: Debt,
  installments: DebtInstallment[],
  increments: DebtIncrement[],
): boolean {
  return outstandingOfDebt(debt, installments, increments) <= 0;
}
