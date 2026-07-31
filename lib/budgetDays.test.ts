import { describe, expect, it } from "vitest";
import { resolveBudgetBasis } from "./budgetDays";
import type { BudgetPeriodOverride, ExceptionKind } from "./types";
import type { Period } from "./periods";

const period: Period = {
  start: "2026-07-01",
  end: "2026-07-15",
  half: 1,
  year: 2026,
  month: 6,
  label: "1–15 jul 2026",
  key: "2026-07-Q1",
};

describe("resolveBudgetBasis", () => {
  it("sin override: cuenta los días laborables del período (sin domingos)", () => {
    const basis = resolveBudgetBasis(period, [], new Map<string, ExceptionKind>());
    expect(basis.mode).toBe("trabajados");
    expect(basis.manualCount).toBe(false);
    // 2026-07-01 a 2026-07-15 tiene 2 domingos (05 y 12) → 13 días laborables.
    expect(basis.days).toBe(13);
  });

  it("override manual (Modo A): manda el número que escribió el usuario", () => {
    const override: BudgetPeriodOverride = {
      user_id: "u",
      period_key: period.key,
      workdays: 10,
      mode: "trabajados",
      custom_days: [],
    };
    const basis = resolveBudgetBasis(period, [override], new Map());
    expect(basis.mode).toBe("trabajados");
    expect(basis.manualCount).toBe(true);
    expect(basis.days).toBe(10);
  });

  it("override personalizado (Modo B): cuenta solo las fechas dentro del período", () => {
    const override: BudgetPeriodOverride = {
      user_id: "u",
      period_key: period.key,
      workdays: 0,
      mode: "personalizado",
      custom_days: ["2026-07-03", "2026-07-10", "2026-06-30"],
    };
    const basis = resolveBudgetBasis(period, [override], new Map());
    expect(basis.mode).toBe("personalizado");
    expect(basis.customDays).toEqual(["2026-07-03", "2026-07-10"]);
    expect(basis.days).toBe(2);
  });

  it("una excepción 'trabajado' cuenta un domingo como laborable", () => {
    const exMap = new Map<string, ExceptionKind>([["2026-07-05", "trabajado"]]);
    const basis = resolveBudgetBasis(period, [], exMap);
    expect(basis.days).toBe(14);
  });
});
