import { describe, expect, it } from "vitest";
import { balanceOfAccount, balanceOfAccounts, deltaForAccount, isExpense, isIncome } from "./balances";
import type { SavingsMovement } from "./types";

function movement(overrides: Partial<SavingsMovement>): SavingsMovement {
  return {
    id: "m1",
    account_id: "a",
    user_id: "u",
    kind: "deposito",
    amount: 100,
    date: "2026-07-01",
    note: null,
    source: "manual",
    source_ref_id: null,
    to_account_id: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("deltaForAccount", () => {
  it("suma un depósito a la cuenta", () => {
    expect(deltaForAccount(movement({ kind: "deposito", amount: 50, account_id: "a" }), "a")).toBe(50);
  });

  it("resta un retiro a la cuenta", () => {
    expect(deltaForAccount(movement({ kind: "retiro", amount: 50, account_id: "a" }), "a")).toBe(-50);
  });

  it("ignora movimientos de otra cuenta", () => {
    expect(deltaForAccount(movement({ kind: "deposito", amount: 50, account_id: "b" }), "a")).toBe(0);
  });

  it("una transferencia resta en el origen y suma en el destino", () => {
    const t = movement({ kind: "transferencia", amount: 30, account_id: "a", to_account_id: "b" });
    expect(deltaForAccount(t, "a")).toBe(-30);
    expect(deltaForAccount(t, "b")).toBe(30);
    expect(deltaForAccount(t, "c")).toBe(0);
  });
});

describe("balanceOfAccount", () => {
  it("suma el ledger completo de una cuenta", () => {
    const movements = [
      movement({ kind: "deposito", amount: 100, account_id: "a" }),
      movement({ kind: "retiro", amount: 30, account_id: "a" }),
      movement({ kind: "deposito", amount: 999, account_id: "b" }),
    ];
    expect(balanceOfAccount(movements, "a")).toBe(70);
  });
});

describe("balanceOfAccounts", () => {
  it("una transferencia entre dos cuentas del conjunto se cancela sola", () => {
    const movements = [
      movement({ kind: "deposito", amount: 200, account_id: "a" }),
      movement({ kind: "transferencia", amount: 50, account_id: "a", to_account_id: "b" }),
    ];
    expect(balanceOfAccounts(movements, ["a", "b"])).toBe(200);
  });

  it("suma cuenta por cuenta cuando no hay transferencias entre ellas", () => {
    const movements = [
      movement({ kind: "deposito", amount: 100, account_id: "a" }),
      movement({ kind: "deposito", amount: 40, account_id: "b" }),
    ];
    expect(balanceOfAccounts(movements, ["a", "b"])).toBe(140);
  });
});

describe("isIncome / isExpense", () => {
  it("un depósito es ingreso, no gasto", () => {
    const m = movement({ kind: "deposito" });
    expect(isIncome(m)).toBe(true);
    expect(isExpense(m)).toBe(false);
  });

  it("un retiro es gasto, no ingreso", () => {
    const m = movement({ kind: "retiro" });
    expect(isIncome(m)).toBe(false);
    expect(isExpense(m)).toBe(true);
  });

  it("una transferencia entre cuentas propias no es ingreso ni gasto", () => {
    const m = movement({ kind: "transferencia" });
    expect(isIncome(m)).toBe(false);
    expect(isExpense(m)).toBe(false);
  });
});
