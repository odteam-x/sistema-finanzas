import { describe, expect, it } from "vitest";
import {
  SPENDING_WINDOW_DAYS,
  averageDailySpend,
  perDayFromHistory,
  spendByDay,
  spendingWindow,
} from "./spendingHistory";

describe("spendByDay", () => {
  it("suma varios gastos del mismo día en un solo total", () => {
    const byDay = spendByDay([
      { date: "2026-07-01", amount: 100 },
      { date: "2026-07-01", amount: 50 },
      { date: "2026-07-02", amount: 30 },
    ]);
    expect(byDay.get("2026-07-01")).toBe(150);
    expect(byDay.get("2026-07-02")).toBe(30);
    expect(byDay.size).toBe(2);
  });

  it("sin gastos devuelve un mapa vacío", () => {
    expect(spendByDay([]).size).toBe(0);
  });
});

describe("averageDailySpend", () => {
  it("divide el total entre los días laborables, no entre los días con gasto", () => {
    // 600 en 2 días con gasto, pero la ventana tiene 10 laborables: el
    // promedio es 60, no 300 — los días sin gastar también cuentan.
    const expenses = [
      { date: "2026-07-01", amount: 400 },
      { date: "2026-07-02", amount: 200 },
    ];
    expect(averageDailySpend(expenses, 10)).toBe(60);
  });

  it("sin días laborables no divide entre cero", () => {
    expect(averageDailySpend([{ date: "2026-07-01", amount: 100 }], 0)).toBe(0);
  });

  it("sin gastos el promedio es cero", () => {
    expect(averageDailySpend([], 10)).toBe(0);
  });
});

describe("spendingWindow", () => {
  it("termina AYER: hoy va incompleto y hundiría el promedio cada mañana", () => {
    const { to } = spendingWindow("2026-07-31");
    expect(to).toBe("2026-07-30");
  });

  it("cubre exactamente la ventana configurada", () => {
    const { from, to } = spendingWindow("2026-07-31");
    const days =
      (Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86400000 + 1;
    expect(days).toBe(SPENDING_WINDOW_DAYS);
  });
});

describe("perDayFromHistory", () => {
  it("con gasto real da un número mayor a cero aunque no haya categorías", () => {
    // El caso de aceptación: sin presupuesto configurado, el promedio sale
    // del historial y ya no es RD$0.
    const expenses = [
      { date: "2026-07-10", amount: 1000 },
      { date: "2026-07-15", amount: 500 },
    ];
    expect(perDayFromHistory(expenses, "2026-07-31")).toBeGreaterThan(0);
  });

  it("sin historial devuelve cero", () => {
    expect(perDayFromHistory([], "2026-07-31")).toBe(0);
  });
});
