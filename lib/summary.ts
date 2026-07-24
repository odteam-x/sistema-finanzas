// Resumen financiero central. El dashboard y las sugerencias derivan TODAS
// sus métricas de aquí, calculadas en vivo desde la base de datos, de modo
// que cualquier dato nuevo se refleja al instante en todas las secciones.
import {
  getBudgetCategories,
  getDebtIncrements,
  getDebts,
  getExceptions,
  getExpenses,
  getGoals,
  getInstallments,
  getPeriodOverrides,
  getSalaries,
  getSalarySettings,
  getSavingsAccounts,
  getSavingsMovements,
  getSubscriptions,
  getTags,
} from "./data";
import { countWorkdays, exceptionsMap } from "./calendar";
import { balanceOfAccount, balanceOfAccounts, deltaForAccount } from "./balances";
import { outstandingOfDebt } from "./debts";
import { quincenaForDate, nextPayDateFrom, type Period } from "./periods";
import { addDaysISO, daysBetween, formatDOP, toISODate, todayISO } from "./format";
import type { AccountType, Goal, Salary, SavingsMovement } from "./types";

export interface Alert {
  tone: "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface Commitment {
  date: string;
  name: string;
  amount: number;
  kind: "debt" | "subscription";
}

export interface FinanceSummary {
  today: string;
  quincena: Period;
  ingresoQuincena: number;
  /** Ingreso auto-generado de esta quincena que el usuario aún no confirmó
   *  que llegó — mientras exista, no cuenta en `ingresoQuincena`. */
  pendingSalary: Salary | null;
  monthIncome: number;
  perDay: number;
  workedQuincena: number;
  estQuincena: number;
  realQuincena: number;
  cuotasPeriodo: number;
  saldoEstimado: number;
  saldoReal: number;
  nextPay: string;
  daysToPay: number;
  nextDue: string | null;
  daysToDue: number | null;
  nextDueName: string | null;
  outstandingDebt: number;
  goals: Goal[];
  totalSaved: number;
  totalTarget: number;
  generalSavings: number;
  savingsTotal: number;
  /** Balance de cada cuenta por separado — alimenta las tarjetas "Balance
   *  actual" (una cuenta) y "Balance total" (todas) del Inicio (R12). */
  accountBalances: {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    isSavings: boolean;
  }[];
  netWorth: number;
  estByCategory: NamedValue[];
  realByCategory: NamedValue[];
  alerts: Alert[];
  upcomingCommitments: Commitment[];
  recentMovements: SavingsMovement[];
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const today = todayISO();
  const q = quincenaForDate(today);
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  const monthEnd = toISODate(new Date(q.year, q.month + 1, 0, 12));

  // Ventana de 3 meses hacia atrás (incluye el mes actual) para comparar el
  // gasto por etiqueta de este mes contra su promedio reciente.
  const anomalyStart = toISODate(new Date(q.year, q.month - 2, 1, 12));

  const [
    settings,
    salaries,
    categories,
    exceptions,
    expenses,
    debts,
    installments,
    debtIncrements,
    goals,
    savingsAccounts,
    savingsMovements,
    tags,
    periodOverrides,
    trailingExpenses,
    subscriptions,
  ] = await Promise.all([
    getSalarySettings(),
    getSalaries(),
    getBudgetCategories(),
    getExceptions(monthStart, monthEnd),
    getExpenses(q.start, q.end),
    getDebts(),
    getInstallments(),
    getDebtIncrements(),
    getGoals(),
    getSavingsAccounts(),
    getSavingsMovements(),
    getTags(),
    getPeriodOverrides(),
    getExpenses(anomalyStart, monthEnd),
    getSubscriptions(),
  ]);

  // Balance por cuenta: una sola implementación compartida (lib/balances.ts),
  // ya no una closure local repetida en cada pantalla.
  const balanceOf = (accountId: string) => balanceOfAccount(savingsMovements, accountId);

  // Suma cuenta por cuenta (no un reduce plano sobre los montos) para que una
  // transferencia entre dos cuentas propias se cancele sola en vez de contarse.
  const savingsTotal = balanceOfAccounts(
    savingsMovements,
    savingsAccounts.map((a) => a.id),
  );

  // Balance de cada cuenta por separado — alimenta las tarjetas del Inicio
  // (R12: una cuenta seleccionable vs. el total de todas).
  const accountBalances = savingsAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: balanceOf(a.id),
    isSavings: a.type === "ahorro",
  }));

  // Ingreso quincenal: SOLO lo que ya se confirmó que llegó, no lo
  // configurado — antes se usaba `settings.default_amount` sin más, así que
  // el dinero aparecía "disponible" desde el día 1 de la quincena, antes de
  // que el cobro pasara de verdad. `runSalaryCatchUp` genera la fila de
  // `salaries` con `confirmed: false` en la fecha de cobro; hasta que el
  // usuario la confirma (banner en el Inicio), no suma acá.
  const salariesThisQuincena = salaries.filter((s) => s.pay_date >= q.start && s.pay_date <= q.end);
  const ingresoQuincena = salariesThisQuincena
    .filter((s) => s.confirmed)
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const pendingSalary = salariesThisQuincena.find((s) => !s.confirmed) ?? null;

  const monthIncome = salaries
    .filter((s) => s.confirmed && s.pay_date.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, s) => sum + Number(s.amount), 0);

  // Presupuesto
  const exMap = exceptionsMap(exceptions);
  const override = periodOverrides.find((o) => o.period_key === q.key);
  const workedQuincena = override ? override.workdays : countWorkdays(q.start, q.end, exMap);
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
      const name = (e.tag_id && tags.find((t) => t.id === e.tag_id)?.name) || "General";
      map.set(name, (map.get(name) ?? 0) + Number(e.amount));
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  })();

  // Gastos inusuales: gasto de este mes por etiqueta vs. el promedio de los
  // meses anteriores con datos. Sin backfill de category_id → tag_id (no
  // son 1 a 1), así que hasta que se acumule historial etiquetado esto
  // simplemente no encuentra nada que comparar — no genera falsos positivos.
  const unusualTags: { name: string; pct: number }[] = (() => {
    const currentMonthKey = today.slice(0, 7);
    const byMonthTag = new Map<string, number>();
    for (const e of trailingExpenses) {
      if (!e.tag_id) continue;
      const key = `${e.date.slice(0, 7)}|${e.tag_id}`;
      byMonthTag.set(key, (byMonthTag.get(key) ?? 0) + Number(e.amount));
    }
    const priorMonthKeys = new Set<string>();
    for (const key of byMonthTag.keys()) {
      const mk = key.split("|")[0];
      if (mk !== currentMonthKey) priorMonthKeys.add(mk);
    }
    if (priorMonthKeys.size === 0) return [];

    const results: { name: string; pct: number }[] = [];
    for (const tag of tags) {
      const current = byMonthTag.get(`${currentMonthKey}|${tag.id}`) ?? 0;
      if (current <= 0) continue;
      let priorTotal = 0;
      let priorCount = 0;
      for (const mk of priorMonthKeys) {
        const v = byMonthTag.get(`${mk}|${tag.id}`);
        if (v != null) {
          priorTotal += v;
          priorCount++;
        }
      }
      if (priorCount === 0) continue;
      const avg = priorTotal / priorCount;
      if (avg > 0 && current > avg * 1.5) {
        results.push({ name: tag.name, pct: Math.round(((current - avg) / avg) * 100) });
      }
    }
    return results;
  })();

  // Deudas. El total adeudado sale de lib/debts.ts (misma implementación que
  // usa la pantalla de Deudas), así incluye los aumentos posteriores (R02) —
  // antes se sumaba a mano acá y se habría quedado con el monto original.
  const outstandingDebt = debts.reduce(
    (s, d) => s + outstandingOfDebt(d, installments, debtIncrements),
    0,
  );
  let cuotasPeriodo = 0;
  const upcoming: Commitment[] = [];
  for (const d of debts) {
    if (d.payment_type === "cuotas") {
      for (const i of installments.filter((x) => x.debt_id === d.id && !x.paid)) {
        upcoming.push({ date: i.due_date, name: d.name, amount: Number(i.amount), kind: "debt" });
        if (i.due_date >= q.start && i.due_date <= q.end) {
          cuotasPeriodo += Number(i.amount);
        }
      }
    } else if (d.status !== "pagada" && d.due_date) {
      const pendiente = outstandingOfDebt(d, installments, debtIncrements);
      upcoming.push({ date: d.due_date, name: d.name, amount: pendiente, kind: "debt" });
      if (d.due_date >= q.start && d.due_date <= q.end) {
        cuotasPeriodo += pendiente;
      }
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0] ?? null;

  // Compromisos de los próximos 7 días para el Inicio: deudas + suscripciones
  // activas, separado de `upcoming` (solo deudas) para no cambiar a qué
  // apunta "Próxima deuda" en el resto del resumen.
  const subscriptionCommitments: Commitment[] = subscriptions
    .filter((s) => s.active)
    .map((s) => ({ date: s.next_charge_date, name: s.name, amount: Number(s.amount), kind: "subscription" as const }));
  const sevenDaysOut = addDaysISO(today, 7);
  const upcomingCommitments = [...upcoming, ...subscriptionCommitments]
    .filter((c) => c.date >= today && c.date <= sevenDaysOut)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Pago de sueldo
  const nextPay = nextPayDateFrom(settings.next_pay_date, settings.frequency, today) ?? today;

  const saldoEstimado = ingresoQuincena - estQuincena - cuotasPeriodo;

  // Aportes netos a cuentas de ahorro (generales o de meta) esta quincena:
  // ese dinero ya no está "disponible para gastar" — está apartado en otra
  // cuenta con otro destino — así que se resta aparte del gasto normal.
  // Neto, para que sacar plata de un ahorro sí la devuelva al disponible.
  // Se calcula con deltaForAccount (no con un reduce propio) para que una
  // transferencia HACIA un ahorro cuente como aporte y una que sale de él
  // lo devuelva, con la misma regla que usa el balance de esa cuenta.
  const ahorroAccountIds = savingsAccounts.filter((a) => a.type === "ahorro").map((a) => a.id);
  const movementsThisQuincena = savingsMovements.filter(
    (m) => m.date >= q.start && m.date <= q.end,
  );
  const savingsContributedThisQuincena = ahorroAccountIds.reduce(
    (total, id) =>
      total + movementsThisQuincena.reduce((s, m) => s + deltaForAccount(m, id), 0),
    0,
  );

  // Balance real: ingreso confirmado menos el gasto REAL registrado (que ya
  // incluye los pagos de deuda de esta quincena, contados como gasto desde
  // que se pagan — ver recordDebtPayment en deudas/actions.ts) menos lo
  // apartado en ahorros. Antes se restaba el pago de deuda dos veces por
  // separado (una vez aquí y de nuevo al no estar en `expenses`); ahora una
  // sola fuente de verdad: `realQuincena`.
  const saldoReal = ingresoQuincena - realQuincena - savingsContributedThisQuincena;

  // Metas con una cuenta vinculada derivan su progreso del saldo real de
  // esa cuenta en vez del current_amount manual (ver balance/page.tsx) — se
  // parcha aquí una sola vez para que cualquier consumidor de s.goals
  // (Dashboard, etc.) ya reciba el monto correcto sin repetir la lógica.
  const goalsWithDerived: Goal[] = goals.map((g) => {
    const linked = savingsAccounts.find((a) => a.goal_id === g.id);
    return linked ? { ...g, current_amount: balanceOf(linked.id) } : g;
  });
  const totalSaved = goalsWithDerived.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalTarget = goalsWithDerived.reduce((s, g) => s + Number(g.target_amount), 0);
  // Ahorro general: cuentas tipo "ahorro" que no están atadas a ninguna
  // meta — se suma aparte de totalSaved (que alimenta el anillo de metas,
  // saved/target) para no inflar ese porcentaje con dinero sin objetivo.
  const generalSavings = savingsAccounts
    .filter((a) => a.type === "ahorro" && !a.goal_id)
    .reduce((s, a) => s + balanceOf(a.id), 0);

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
  for (const t of unusualTags) {
    alerts.push({
      tone: "warning",
      title: "Gasto inusual",
      message: `Este mes llevas ${t.pct}% más de lo usual en “${t.name}”.`,
    });
  }
  if (estQuincena > 0 && realQuincena <= estQuincena && ingresoQuincena > 0 && saldoEstimado >= 0) {
    alerts.push({
      tone: "success",
      title: "Vas bien",
      // Un dato real, no una palmadita genérica.
      message: `${formatDOP(realQuincena, false)} de ${formatDOP(estQuincena, false)} gastados esta quincena.`,
    });
  }

  return {
    today,
    quincena: q,
    ingresoQuincena,
    pendingSalary,
    monthIncome,
    perDay,
    workedQuincena,
    estQuincena,
    realQuincena,
    cuotasPeriodo,
    saldoEstimado,
    saldoReal,
    nextPay,
    daysToPay: daysBetween(today, nextPay),
    nextDue: next?.date ?? null,
    daysToDue: next ? daysBetween(today, next.date) : null,
    nextDueName: next?.name ?? null,
    outstandingDebt,
    goals: goalsWithDerived,
    totalSaved,
    totalTarget,
    generalSavings,
    savingsTotal,
    accountBalances,
    netWorth: savingsTotal - outstandingDebt,
    estByCategory,
    realByCategory,
    alerts,
    upcomingCommitments,
    recentMovements: savingsMovements.slice(0, 5),
  };
}
