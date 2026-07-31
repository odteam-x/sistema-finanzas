import { describe, expect, it } from "vitest";
import { isSettled, outstandingOfDebt, paidOfDebt, totalOfDebt } from "./debts";
import type { Debt, DebtIncrement, DebtInstallment } from "./types";

function debt(overrides: Partial<Debt>): Debt {
  return {
    id: "d1",
    user_id: "u",
    name: "Deuda",
    total_amount: 1000,
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

function installment(overrides: Partial<DebtInstallment>): DebtInstallment {
  return {
    id: "i1",
    debt_id: "d1",
    user_id: "u",
    seq: 1,
    due_date: "2026-02-01",
    amount: 100,
    paid: false,
    paid_date: null,
    ...overrides,
  };
}

function increment(overrides: Partial<DebtIncrement>): DebtIncrement {
  return {
    id: "c1",
    debt_id: "d1",
    user_id: "u",
    amount: 200,
    date: "2026-01-15",
    note: null,
    created_at: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("totalOfDebt", () => {
  it("suma el monto original más los incrementos de ESA deuda", () => {
    const increments = [increment({ debt_id: "d1", amount: 200 }), increment({ debt_id: "otra", amount: 999 })];
    expect(totalOfDebt(debt({ total_amount: 1000 }), increments)).toBe(1200);
  });

  it("sin incrementos, el total es el monto original", () => {
    expect(totalOfDebt(debt({ total_amount: 500 }), [])).toBe(500);
  });
});

describe("paidOfDebt", () => {
  it("pago único: todo o nada según el estado", () => {
    expect(paidOfDebt(debt({ payment_type: "unico", total_amount: 500, status: "pagada" }), [])).toBe(500);
    expect(paidOfDebt(debt({ payment_type: "unico", total_amount: 500, status: "pendiente" }), [])).toBe(0);
  });

  it("en cuotas, suma solo las marcadas pagadas de ESA deuda", () => {
    const installments = [
      installment({ debt_id: "d1", amount: 100, paid: true }),
      installment({ debt_id: "d1", amount: 100, paid: false }),
      installment({ debt_id: "otra", amount: 999, paid: true }),
    ];
    expect(paidOfDebt(debt({ payment_type: "cuotas" }), installments)).toBe(100);
  });
});

describe("outstandingOfDebt", () => {
  it("resta lo abonado del total (con incrementos)", () => {
    const d = debt({ payment_type: "cuotas", total_amount: 1000 });
    const installments = [installment({ debt_id: "d1", amount: 300, paid: true })];
    const increments = [increment({ debt_id: "d1", amount: 200 })];
    expect(outstandingOfDebt(d, installments, increments)).toBe(900);
  });

  it("nunca es negativo", () => {
    const d = debt({ payment_type: "unico", total_amount: 100, status: "pagada" });
    expect(outstandingOfDebt(d, [], [])).toBe(0);
  });
});

describe("isSettled", () => {
  it("liquidada cuando no queda nada por pagar", () => {
    const d = debt({ payment_type: "unico", total_amount: 100, status: "pagada" });
    expect(isSettled(d, [], [])).toBe(true);
  });

  it("un incremento posterior puede reabrir una deuda liquidada", () => {
    const d = debt({ payment_type: "unico", total_amount: 100, status: "pagada" });
    const increments = [increment({ debt_id: "d1", amount: 50 })];
    expect(isSettled(d, [], increments)).toBe(false);
  });
});
