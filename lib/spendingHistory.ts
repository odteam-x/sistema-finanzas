// Cuánto gastas AL DÍA de verdad, según tu historial — no según lo que
// configuraste que querías gastar.
//
// Antes "Gasto fijo por día" salía de sumar `amount_per_workday` de cada
// categoría activa: un presupuesto que había que configurar a mano, categoría
// por categoría, antes de que la app pudiera decirte nada. Quien no lo
// configuraba veía RD$0 en "Estimado del mes" — y el anillo de presupuesto
// llegaba a mostrar lo gastado como si fuera saldo a favor (ver BudgetRing).
//
// Ahora el número sale del gasto real de los últimos meses. Las categorías NO
// desaparecen: siguen sirviendo para desglosar EN QUÉ se va el dinero, que es
// para lo que son buenas; simplemente dejan de ser la fuente del "cuánto".
import { countWorkdays } from "./calendar";
import { addDaysISO } from "./format";
import type { ExceptionKind } from "./types";

/** Ventana de historial. 90 días ≈ 6 quincenas: suficiente para que un mes
 *  raro no domine el promedio, y corto como para que siga describiendo cómo
 *  gastas HOY y no hace un año. */
export const SPENDING_WINDOW_DAYS = 90;

/** Total gastado por fecha. Un día puede tener varios gastos y lo que
 *  interesa es el total de ese día, no cada renglón suelto. */
export function spendByDay(
  expenses: { date: string; amount: number }[],
): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const e of expenses) {
    byDay.set(e.date, (byDay.get(e.date) ?? 0) + Number(e.amount));
  }
  return byDay;
}

/** Promedio gastado por DÍA LABORABLE de la ventana.
 *
 *  Se divide entre días laborables y no entre "días que tuvieron algún
 *  gasto": el resultado se multiplica después por `workedQuincena` /
 *  `workedMonth` (lib/budgetDays.ts), así que ambos lados tienen que contar
 *  los días con el mismo criterio. Dividir entre los días con gasto inflaría
 *  el promedio — los días sin gastar también son parte de cómo gastas. */
export function averageDailySpend(
  expenses: { date: string; amount: number }[],
  workdays: number,
): number {
  if (workdays <= 0) return 0;
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  return total / workdays;
}

/** El rango de la ventana de historial que termina ayer: el día de hoy va
 *  incompleto y arrastraría el promedio hacia abajo cada mañana. */
export function spendingWindow(todayISO: string): { from: string; to: string } {
  const to = addDaysISO(todayISO, -1);
  return { from: addDaysISO(to, -(SPENDING_WINDOW_DAYS - 1)), to };
}

/** Promedio diario listo para multiplicar por los días de un período.
 *  Los feriados/días libres del calendario NO se descuentan acá a propósito:
 *  son overrides mes a mes y sobre 90 días su efecto es marginal, mientras
 *  que arrastrarlos obligaría a traer las excepciones de tres meses solo
 *  para mover el promedio unos pesos. Se cuentan los días no-domingo. */
export function perDayFromHistory(
  expenses: { date: string; amount: number }[],
  todayISO: string,
): number {
  const { from, to } = spendingWindow(todayISO);
  const workdays = countWorkdays(from, to, new Map<string, ExceptionKind>());
  return averageDailySpend(expenses, workdays);
}
