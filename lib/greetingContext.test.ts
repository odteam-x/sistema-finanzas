import { describe, it, expect } from "vitest";
import { greetingContext, type GreetingSituation } from "./greetingContext";

const base: GreetingSituation = {
  daysToPay: 7,
  estQuincena: 0,
  realQuincena: 0,
  daysLeftInQuincena: 7,
};

describe("greetingContext", () => {
  it("el día de cobro manda sobre el presupuesto", () => {
    expect(
      greetingContext({ ...base, daysToPay: 0, estQuincena: 10000, realQuincena: 2000 }),
    ).toBe("Hoy es día de cobro");
  });

  it("reparte lo que queda entre los días que faltan", () => {
    expect(
      greetingContext({ ...base, estQuincena: 10000, realQuincena: 4000, daysLeftInQuincena: 6 }),
    ).toBe("Te quedan RD$6,000 para los 6 días que restan");
  });

  it("singulariza el último día", () => {
    expect(
      greetingContext({ ...base, estQuincena: 10000, realQuincena: 9500, daysLeftInQuincena: 1 }),
    ).toBe("Te quedan RD$500 para el último día de la quincena");
  });

  it("calla cuando el presupuesto ya se pasó: la alerta ya lo dice", () => {
    expect(
      greetingContext({ ...base, estQuincena: 10000, realQuincena: 12000, daysLeftInQuincena: 4 }),
    ).toBeNull();
  });

  it("calla cuando el presupuesto se agotó justo", () => {
    expect(
      greetingContext({ ...base, estQuincena: 10000, realQuincena: 10000, daysLeftInQuincena: 4 }),
    ).toBeNull();
  });

  it("calla si la quincena ya cerró aunque sobre presupuesto", () => {
    expect(
      greetingContext({ ...base, estQuincena: 10000, realQuincena: 1000, daysLeftInQuincena: 0 }),
    ).toBeNull();
  });

  it("sin presupuesto, avisa del cobro de mañana", () => {
    expect(greetingContext({ ...base, daysToPay: 1 })).toBe("Mañana es día de cobro");
  });

  it("sin presupuesto, avisa hasta 3 días antes del cobro", () => {
    expect(greetingContext({ ...base, daysToPay: 3 })).toBe("Faltan 3 días para tu cobro");
  });

  it("calla cuando el cobro aún queda lejos y no hay presupuesto", () => {
    expect(greetingContext({ ...base, daysToPay: 4 })).toBeNull();
  });

  it("calla en una cuenta recién creada, sin nada configurado", () => {
    expect(
      greetingContext({ daysToPay: 12, estQuincena: 0, realQuincena: 0, daysLeftInQuincena: 12 }),
    ).toBeNull();
  });
});
