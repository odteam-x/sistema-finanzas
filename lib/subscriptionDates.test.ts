import { describe, expect, it } from "vitest";
import { nextFutureChargeDate, stepChargeDate } from "./subscriptionDates";

describe("stepChargeDate", () => {
  it("mensual avanza un mes", () => {
    expect(stepChargeDate("2026-07-15", "mensual")).toBe("2026-08-15");
  });

  it("anual avanza un año", () => {
    expect(stepChargeDate("2026-07-15", "anual")).toBe("2027-07-15");
  });

  it("cruza el fin de año", () => {
    expect(stepChargeDate("2026-12-10", "mensual")).toBe("2027-01-10");
  });
});

describe("nextFutureChargeDate", () => {
  it("una suscripción pausada un año no acumula cobros: salta al futuro", () => {
    // Este es el caso que motiva la función. Sin ella, reanudar con la fecha
    // congelada en 2025-08-10 haría que el catch-up generara ~12 gastos.
    const next = nextFutureChargeDate("2025-08-10", "mensual", "2026-08-03");
    expect(next > "2026-08-03").toBe(true);
    expect(next).toBe("2026-08-10");
  });

  it("si la fecha ya es futura, no la mueve", () => {
    expect(nextFutureChargeDate("2026-09-01", "mensual", "2026-08-03")).toBe("2026-09-01");
  });

  it("la fecha de HOY se considera vencida y avanza", () => {
    // El catch-up usa `next_charge_date <= today`, así que hoy ya cobraría:
    // reanudar debe dejarla estrictamente en el futuro.
    expect(nextFutureChargeDate("2026-08-03", "mensual", "2026-08-03")).toBe("2026-09-03");
  });

  it("anual pausada tres años salta al próximo aniversario futuro", () => {
    expect(nextFutureChargeDate("2023-03-20", "anual", "2026-08-03")).toBe("2027-03-20");
  });

  it("nunca devuelve una fecha pasada", () => {
    for (const start of ["2020-01-31", "2024-02-29", "2026-08-02"]) {
      expect(nextFutureChargeDate(start, "mensual", "2026-08-03") > "2026-08-03").toBe(true);
    }
  });
});
