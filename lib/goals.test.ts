import { describe, expect, it } from "vitest";
import { goalProgress } from "./goals";
import type { Debt, DebtInstallment, Goal, SavingsAccount, SavingsMovement } from "./types";

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: "g1",
    user_id: "u",
    name: "Meta",
    target_amount: 1000,
    current_amount: 0,
    deadline: null,
    icon: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function account(overrides: Partial<SavingsAccount>): SavingsAccount {
  return {
    id: "a1",
    user_id: "u",
    name: "Cuenta",
    type: "ahorro",
    icon: null,
    goal_id: null,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    currency: "DOP",
    ...overrides,
  };
}

function debt(overrides: Partial<Debt>): Debt {
  return {
    id: "d1",
    user_id: "u",
    name: "Deuda",
    total_amount: 100,
    acquired_date: "2026-01-01",
    due_date: null,
    payment_type: "unico",
    installments_count: null,
    installment_amount: null,
    frequency: null,
    status: "pendiente",
    note: null,
    created_at: "2026-01-01T00:00:00.000Z",
    goal_id: null,
    kind: "credito",
    ...overrides,
  };
}

function contribution(
  overrides: Partial<Pick<SavingsMovement, "source_ref_id" | "kind" | "amount">>,
): Pick<SavingsMovement, "source_ref_id" | "kind" | "amount"> {
  return { source_ref_id: "g1", kind: "retiro", amount: 100, ...overrides };
}

describe("goalProgress", () => {
  it("meta sin cuenta vinculada y sin aportes: usa solo el baseline manual", () => {
    const p = goalProgress(goal({ current_amount: 300 }), [], () => 0, [], [], []);
    expect(p.fromSavings).toBe(300);
    expect(p.total).toBe(300);
  });

  it("meta sin cuenta vinculada: suma los aportes del ledger sobre el baseline", () => {
    const contributions = [
      contribution({ source_ref_id: "g1", kind: "retiro", amount: 150 }),
      contribution({ source_ref_id: "g1", kind: "retiro", amount: 50 }),
      contribution({ source_ref_id: "otra-meta", kind: "retiro", amount: 999 }),
    ];
    const p = goalProgress(goal({ current_amount: 300 }), [], () => 0, [], [], contributions);
    expect(p.fromSavings).toBe(500); // 300 + 150 + 50
  });

  it("un retiro de aporte (deposito) resta del progreso", () => {
    const contributions = [
      contribution({ source_ref_id: "g1", kind: "retiro", amount: 200 }),
      contribution({ source_ref_id: "g1", kind: "deposito", amount: 80 }),
    ];
    const p = goalProgress(goal({ current_amount: 0 }), [], () => 0, [], [], contributions);
    expect(p.fromSavings).toBe(120);
  });

  it("meta con cuenta vinculada: el saldo real de la cuenta manda, ignora baseline y aportes", () => {
    const accounts = [account({ id: "a1", goal_id: "g1" })];
    const contributions = [contribution({ source_ref_id: "g1", kind: "retiro", amount: 999 })];
    const p = goalProgress(
      goal({ id: "g1", current_amount: 500 }),
      accounts,
      (id) => (id === "a1" ? 777 : 0),
      [],
      [],
      contributions,
    );
    expect(p.fromSavings).toBe(777);
  });

  it("suma lo abonado de las deudas vinculadas a la meta", () => {
    const debts = [debt({ id: "d1", goal_id: "g1", payment_type: "unico", total_amount: 400, status: "pagada" })];
    const p = goalProgress(goal({ id: "g1", current_amount: 0 }), [], () => 0, debts, [], []);
    expect(p.fromDebts).toBe(400);
    expect(p.total).toBe(400);
    expect(p.linkedDebts).toHaveLength(1);
  });

  it("no confunde deudas de otras metas", () => {
    const debts = [debt({ id: "d1", goal_id: "otra-meta", status: "pagada", total_amount: 999 })];
    const p = goalProgress(goal({ id: "g1" }), [], () => 0, debts, [] as DebtInstallment[], []);
    expect(p.fromDebts).toBe(0);
    expect(p.linkedDebts).toHaveLength(0);
  });
});
