// Estado del presupuesto de UNA quincena — versión liviana de lo que ya
// calcula lib/summary.ts, pero sin todo lo demás (sueldos, deudas, metas)
// que ese resumen trae. Se usa desde el disparador de push inmediato en
// addExpense (Bloque 12): ahí solo hace falta saber si ESTE gasto hizo
// cruzar el 80%/100% del presupuesto, no el resumen completo del Inicio.
import { getExceptions, getExpenses, getPeriodOverrides } from "./data";
import { exceptionsMap } from "./calendar";
import { resolveBudgetBasis } from "./budgetDays";
import { perDayFromHistory, spendingWindow } from "./spendingHistory";
import { quincenaForDate } from "./periods";
import { getPeriodDays } from "./periodConfig";
import { parseISODate, toISODate } from "./format";

export async function getQuincenaBudgetStatus(
  dateISO: string,
): Promise<{ estQuincena: number; realQuincena: number }> {
  // Mismos períodos que el resto de la app: los que arrancan en los días de
  // cobro del usuario (ver lib/periods.ts).
  const q = quincenaForDate(dateISO, await getPeriodDays());
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  // Hasta el final del mes donde CIERRA: el período puede cruzar de mes.
  const qEnd = parseISODate(q.end);
  const monthEnd = toISODate(new Date(qEnd.getFullYear(), qEnd.getMonth() + 1, 0, 12));

  const window = spendingWindow(dateISO);
  const [exceptions, periodOverrides, expenses, historyExpenses] = await Promise.all([
    getExceptions(monthStart, monthEnd),
    getPeriodOverrides(),
    getExpenses(q.start, q.end),
    getExpenses(window.from, window.to),
  ]);

  const exMap = exceptionsMap(exceptions);
  const basis = resolveBudgetBasis(q, periodOverrides, exMap);
  // Mismo criterio que el resto de la app: lo que sueles gastar al día, no un
  // presupuesto configurado a mano. El aviso pasa a ser "vas por encima de tu
  // ritmo normal", que es lo que de verdad se puede accionar.
  const perDay = perDayFromHistory(historyExpenses, dateISO);
  const estQuincena = perDay * basis.days;
  const realQuincena = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return { estQuincena, realQuincena };
}
