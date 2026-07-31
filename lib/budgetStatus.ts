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
import { toISODate } from "./format";

export async function getQuincenaBudgetStatus(
  dateISO: string,
): Promise<{ estQuincena: number; realQuincena: number }> {
  const q = quincenaForDate(dateISO);
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  const monthEnd = toISODate(new Date(q.year, q.month + 1, 0, 12));

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
