// Fuente ÚNICA del progreso de una meta.
//
// El progreso puede venir de cuatro sitios y hay que sumarlos siempre igual:
//   1. Baseline manual congelado (goals.current_amount) — lo que ya hubiera
//      antes de este fix (alta inicial vía addGoal). Ya no se escribe desde
//      addProgress; se conserva TAL CUAL para no inventar ni borrar dinero
//      de metas que ya existían.
//   2. Aportes reales a la meta vía el ledger: source='goal_contribution'
//      (ver addProgress en metas/actions.ts) — solo aplica si la meta NO
//      está vinculada a una cuenta.
//   3. El saldo de una cuenta de ahorro vinculada (savings_accounts.goal_id)
//      — si la meta está vinculada, ESTO manda solo; (1) y (2) no aplican.
//   4. Lo abonado de las deudas vinculadas a la meta (R14)
// Antes (1) y (3) se combinaban en dos closures separadas (lib/summary.ts y
// metas/page.tsx); al agregar (4) se habrían desincronizado.
import { paidOfDebt } from "./debts";
import type { Debt, DebtInstallment, Goal, SavingsAccount, SavingsMovement } from "./types";

export interface GoalProgress {
  /** Total acumulado hacia la meta (todas las fuentes juntas). */
  total: number;
  /** Cuánto viene de aportes/ahorro (no de deudas). */
  fromSavings: number;
  /** Cuánto viene de pagar deudas vinculadas. */
  fromDebts: number;
  /** Deudas vinculadas a esta meta, para el desglose con enlace. */
  linkedDebts: { debt: Debt; paid: number }[];
}

/** Suma los aportes 'goal_contribution' de UNA meta: 'retiro' = entró al
 *  apartado de la meta (+), 'deposito' = se retiró/corrigió el aporte (-).
 *  Solo aplica a metas SIN cuenta vinculada — ver goalProgress(). */
function goalContributionSum(
  goalId: string,
  contributions: Pick<SavingsMovement, "source_ref_id" | "kind" | "amount">[],
): number {
  return contributions
    .filter((m) => m.source_ref_id === goalId)
    .reduce((s, m) => s + (m.kind === "retiro" ? Number(m.amount) : -Number(m.amount)), 0);
}

export function goalProgress(
  goal: Goal,
  accounts: SavingsAccount[],
  /** Balance de UNA cuenta. Cada llamador decide cómo lo resuelve — desde
   *  el ledger completo ya cargado (lib/summary.ts) o desde la vista SQL
   *  v_account_balances sin traer el historial entero (metas/page.tsx). */
  accountBalance: (accountId: string) => number,
  debts: Debt[],
  installments: DebtInstallment[],
  /** Todos los movimientos 'goal_contribution' del usuario (lib/data.ts:
   *  getGoalContributionMovements) — se filtran acá por goal.id. */
  goalContributions: Pick<SavingsMovement, "source_ref_id" | "kind" | "amount">[],
): GoalProgress {
  // Si hay una cuenta de ahorro vinculada, su saldo real manda sobre
  // cualquier otra fuente (ese es el criterio que ya existía).
  const linkedAccount = accounts.find((a) => a.goal_id === goal.id);
  const fromSavings = linkedAccount
    ? accountBalance(linkedAccount.id)
    : Number(goal.current_amount) + goalContributionSum(goal.id, goalContributions);

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
