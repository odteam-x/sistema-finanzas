import "server-only";
import { getDebtIncrements, getDebts, getInstallments, getSalarySettings, getSubscriptions } from "@/lib/data";
import { outstandingOfDebt } from "@/lib/debts";
import { nextPayDateFrom, fixedPayDays, periodDaysFor, type PeriodDays } from "@/lib/periods";
import { daysBetween, todayISO } from "@/lib/format";
import { debtsDueAfter, itemsDueBefore, type PayoutItem } from "@/lib/payoutPlan";

export interface PayoutContext {
  /** Lo que el usuario dijo que cobra. 0 si no lo ha configurado. */
  gross: number;
  nextPay: string | null;
  daysUntilNextPay: number;
  /** Vencen antes del próximo cobro. Cuentan por defecto. */
  items: PayoutItem[];
  /** Deudas que vencen después. NO cuentan por defecto: están para poder
   *  adelantar el pago de alguna si sobra dinero. */
  laterDebts: PayoutItem[];
  periodDays: PeriodDays;
}

/** Todo lo que la calculadora de "cuánto me queda" necesita saber.
 *
 *  Los compromisos se arman con la MISMA regla que usa el Inicio (ver el bucle
 *  de deudas en lib/summary.ts): de una deuda a cuotas cuentan las cuotas sin
 *  pagar; de una de pago único, lo que queda debiéndose —que incluye los
 *  aumentos posteriores, por eso sale de outstandingOfDebt y no del monto
 *  original. */
export async function getPayoutContext(): Promise<PayoutContext> {
  const today = todayISO();
  const [settings, debts, installments, increments, subscriptions] = await Promise.all([
    getSalarySettings(),
    getDebts(),
    getInstallments(),
    getDebtIncrements(),
    getSubscriptions(),
  ]);

  const nextPay = nextPayDateFrom(
    settings.next_pay_date,
    settings.frequency,
    today,
    fixedPayDays(settings.pay_day_1, settings.pay_day_2),
  );

  const todos: PayoutItem[] = [];
  for (const d of debts) {
    if (d.payment_type === "cuotas") {
      for (const i of installments.filter((x) => x.debt_id === d.id && !x.paid)) {
        todos.push({
          id: `cuota-${i.id}`,
          name: d.name,
          amount: Number(i.amount),
          date: i.due_date,
          kind: "debt",
          overdue: false,
        });
      }
    } else if (d.status !== "pagada" && d.due_date) {
      todos.push({
        id: `deuda-${d.id}`,
        name: d.name,
        amount: outstandingOfDebt(d, installments, increments),
        date: d.due_date,
        kind: "debt",
        overdue: false,
      });
    }
  }
  for (const s of subscriptions.filter((x) => x.active)) {
    todos.push({
      id: `sub-${s.id}`,
      name: s.name,
      amount: Number(s.amount),
      date: s.next_charge_date,
      kind: "subscription",
      overdue: false,
    });
  }

  return {
    gross: Number(settings.default_amount) || 0,
    nextPay,
    // Sin fecha de cobro configurada no hay días que repartir, y el `porDia`
    // de payoutTotals se apaga solo con 0.
    daysUntilNextPay: nextPay ? Math.max(0, daysBetween(today, nextPay)) : 0,
    items: nextPay ? itemsDueBefore(todos, today, nextPay) : [],
    laterDebts: nextPay ? debtsDueAfter(todos, nextPay) : [],
    periodDays: periodDaysFor(settings),
  };
}
