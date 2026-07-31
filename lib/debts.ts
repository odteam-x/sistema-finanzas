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

/** Agrupa las deudas por acreedor: el mismo nombre puede tener varias (dos
 *  préstamos distintos con la misma persona o entidad). Vive acá y no en la
 *  página porque ahora hay DOS pantallas que agrupan igual — pendientes e
 *  historial — y si se desincronizaran, la misma deuda aparecería bajo
 *  encabezados distintos según dónde la mires. */
export function groupDebts(debts: Debt[]): { key: string; name: string; debts: Debt[] }[] {
  const groups = new Map<string, { key: string; name: string; debts: Debt[] }>();
  for (const d of debts) {
    const g = groups.get(d.name) ?? { key: d.name, name: d.name, debts: [] };
    g.debts.push(d);
    groups.set(d.name, g);
  }
  return Array.from(groups.values());
}
