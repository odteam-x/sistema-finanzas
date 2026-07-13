// Resumen financiero central. El dashboard y las sugerencias derivan TODAS
// sus métricas de aquí, calculadas en vivo desde la base de datos, de modo
// que cualquier dato nuevo se refleja al instante en todas las secciones.
import {
  getBudgetCategories,
  getDebts,
  getExceptions,
  getExpenses,
  getGoals,
  getInstallments,
  getSalaries,
  getSalarySettings,
  getSavingsMovements,
} from "./data";
import { countWorkdays, exceptionsMap } from "./calendar";
import { quincenaForDate, nextPayDate, type Period } from "./periods";
import { daysBetween, toISODate, todayISO } from "./format";
import type { Goal } from "./types";

export interface Alert {
  tone: "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface FinanceSummary {
  today: string;
  quincena: Period;
  ingresoQuincena: number;
  monthIncome: number;
  perDay: number;
  workedQuincena: number;
  estQuincena: number;
  realQuincena: number;
  cuotasPeriodo: number;
  saldoEstimado: number;
  nextPay: string;
  daysToPay: number;
  nextDue: string | null;
  daysToDue: number | null;
  nextDueName: string | null;
  outstandingDebt: number;
  goals: Goal[];
  totalSaved: number;
  totalTarget: number;
  savingsTotal: number;
  estByCategory: NamedValue[];
  realByCategory: NamedValue[];
  alerts: Alert[];
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const today = todayISO();
  const q = quincenaForDate(today);
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  const monthEnd = toISODate(new Date(q.year, q.month + 1, 0, 12));

  const [
    settings,
    salaries,
    categories,
    exceptions,
    expenses,
    debts,
    installments,
    goals,
    savingsMovements,
  ] = await Promise.all([
    getSalarySettings(),
    getSalaries(),
    getBudgetCategories(),
    getExceptions(monthStart, monthEnd),
    getExpenses(q.start, q.end),
    getDebts(),
    getInstallments(),
    getGoals(),
    getSavingsMovements(),
  ]);

  const savingsTotal = savingsMovements.reduce(
    (s, m) => s + (m.kind === "deposito" ? 1 : -1) * Number(m.amount),
    0,
  );

  // Ingreso quincenal: config por defecto o última quincena registrada
  const lastQuincena = salaries.find((s) => s.kind === "quincena");
  const ingresoQuincena =
    settings.default_amount > 0
      ? settings.default_amount
      : lastQuincena
        ? Number(lastQuincena.amount)
        : 0;

  const monthIncome = salaries
    .filter((s) => s.pay_date.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, s) => sum + Number(s.amount), 0);

  // Presupuesto
  const exMap = exceptionsMap(exceptions);
  const workedQuincena = countWorkdays(q.start, q.end, exMap);
  const activeCats = categories.filter((c) => c.active);
  const perDay = activeCats.reduce((s, c) => s + Number(c.amount_per_workday), 0);
  const estQuincena = perDay * workedQuincena;
  const realQuincena = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const estByCategory: NamedValue[] = activeCats
    .map((c) => ({ name: c.name, value: Number(c.amount_per_workday) * workedQuincena }))
    .filter((c) => c.value > 0);

  const realByCategory: NamedValue[] = (() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const name =
        (e.category_id && categories.find((c) => c.id === e.category_id)?.name) ||
        "General";
      map.set(name, (map.get(name) ?? 0) + Number(e.amount));
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  })();

  // Deudas
  let outstandingDebt = 0;
  let cuotasPeriodo = 0;
  const upcoming: { date: string; name: string }[] = [];
  for (const d of debts) {
    if (d.payment_type === "cuotas") {
      for (const i of installments.filter((x) => x.debt_id === d.id && !x.paid)) {
        outstandingDebt += Number(i.amount);
        upcoming.push({ date: i.due_date, name: d.name });
        if (i.due_date >= q.start && i.due_date <= q.end) {
          cuotasPeriodo += Number(i.amount);
        }
      }
    } else if (d.status !== "pagada") {
      outstandingDebt += Number(d.total_amount);
      if (d.due_date) {
        upcoming.push({ date: d.due_date, name: d.name });
        if (d.due_date >= q.start && d.due_date <= q.end) {
          cuotasPeriodo += Number(d.total_amount);
        }
      }
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0] ?? null;

  // Pago de sueldo
  const nextPay = nextPayDate(today, settings.pay_day_1, settings.pay_day_2);

  const saldoEstimado = ingresoQuincena - estQuincena - cuotasPeriodo;

  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);

  // ---- Alertas derivadas de los datos ----
  const alerts: Alert[] = [];

  if (ingresoQuincena > 0 && estQuincena > 0.7 * ingresoQuincena) {
    alerts.push({
      tone: "warning",
      title: "Gastos fijos altos",
      message: `Tu presupuesto de gastos diarios (${Math.round((estQuincena / ingresoQuincena) * 100)}%) supera el 70% de tu ingreso quincenal.`,
    });
  }
  if (ingresoQuincena > 0 && saldoEstimado < 0) {
    alerts.push({
      tone: "danger",
      title: "Presupuesto por encima del ingreso",
      message:
        "Entre gastos diarios y cuotas, estás gastando más de lo que ingresas esta quincena. Revisa tus categorías o deudas.",
    });
  }
  if (estQuincena > 0 && realQuincena > estQuincena) {
    alerts.push({
      tone: "warning",
      title: "Vas sobre el presupuesto",
      message:
        "Tus gastos reales de la quincena ya superan lo presupuestado. Cuida los próximos días.",
    });
  }
  if (next) {
    const d = daysBetween(today, next.date);
    if (d >= 0 && d <= 7) {
      alerts.push({
        tone: "warning",
        title: "Vencimiento cercano",
        message: `“${next.name}” vence ${d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`}.`,
      });
    } else if (d < 0) {
      alerts.push({
        tone: "danger",
        title: "Deuda vencida",
        message: `Tienes un pago vencido de “${next.name}”.`,
      });
    }
  }
  if (goals.length === 0) {
    alerts.push({
      tone: "info",
      title: "Define una meta",
      message: "Crear una meta de ahorro te ayuda a mantener el rumbo.",
    });
  }
  if (estQuincena > 0 && realQuincena <= estQuincena && ingresoQuincena > 0 && saldoEstimado >= 0) {
    alerts.push({
      tone: "success",
      title: "Vas bien",
      message: "Tus gastos están dentro del presupuesto de esta quincena. ¡Sigue así!",
    });
  }

  return {
    today,
    quincena: q,
    ingresoQuincena,
    monthIncome,
    perDay,
    workedQuincena,
    estQuincena,
    realQuincena,
    cuotasPeriodo,
    saldoEstimado,
    nextPay,
    daysToPay: daysBetween(today, nextPay),
    nextDue: next?.date ?? null,
    daysToDue: next ? daysBetween(today, next.date) : null,
    nextDueName: next?.name ?? null,
    outstandingDebt,
    goals,
    totalSaved,
    totalTarget,
    savingsTotal,
    estByCategory,
    realByCategory,
    alerts,
  };
}
