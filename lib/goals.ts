// Fuente ÚNICA del progreso de una meta.
//
// El progreso puede venir de tres sitios y hay que sumarlos siempre igual:
//   1. Aportes directos (goals.current_amount, editado a mano)
//   2. El saldo de una cuenta de ahorro vinculada (savings_accounts.goal_id)
//   3. Lo abonado de las deudas vinculadas a la meta (R14)
// Antes (1) y (2) se combinaban en dos closures separadas (lib/summary.ts y
// metas/page.tsx); al agregar (3) se habrían desincronizado.
import { paidOfDebt } from "./debts";
import { balanceOfAccount } from "./balances";
import type { Debt, DebtInstallment, Goal, SavingsAccount, SavingsMovement } from "./types";

export interface GoalProgress {
  /** Total acumulado hacia la meta (las tres fuentes juntas). */
  total: number;
  /** Cuánto viene de aportes/ahorro (no de deudas). */
  fromSavings: number;
  /** Cuánto viene de pagar deudas vinculadas. */
  fromDebts: number;
  /** Deudas vinculadas a esta meta, para el desglose con enlace. */
  linkedDebts: { debt: Debt; paid: number }[];
}

export function goalProgress(
  goal: Goal,
  accounts: SavingsAccount[],
  movements: SavingsMovement[],
  debts: Debt[],
  installments: DebtInstallment[],
): GoalProgress {
  // Si hay una cuenta de ahorro vinculada, su saldo real manda sobre el
  // current_amount manual (ese es el criterio que ya existía).
  const linkedAccount = accounts.find((a) => a.goal_id === goal.id);
  const fromSavings = linkedAccount
    ? balanceOfAccount(movements, linkedAccount.id)
    : Number(goal.current_amount);

  const linkedDebts = debts
    .filter((d) => d.goal_id === goal.id)
    .map((debt) => ({ debt, paid: paidOfDebt(debt, installments) }));
  const fromDebts = linkedDebts.reduce((s, l) => s + l.paid, 0);

  return {
    total: fromSavings + fromDebts,
    fromSavings,
    fromDebts,
    linkedDebts,
  };
}
