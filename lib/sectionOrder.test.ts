import { describe, it, expect } from "vitest";
import { orderHomeSections, type SectionSituation, type HomeSection } from "./sectionOrder";

const BASE: HomeSection[] = ["compromisos", "movimientos", "gastos", "ahorros"];

/** Cuenta tranquila: presupuesto holgado, nada por vencer, metas lejos. */
const tranquilo: SectionSituation = {
  budgetPct: 40,
  daysToNextCommitment: 20,
  goalsPct: 30,
};

describe("orderHomeSections", () => {
  it("no pierde ni duplica secciones", () => {
    const out = orderHomeSections(tranquilo);
    expect(out).toHaveLength(BASE.length);
    expect(new Set(out).size).toBe(BASE.length);
  });

  it("sin señales activas, no mueve nada", () => {
    expect(orderHomeSections(tranquilo)).toEqual(BASE);
  });

  it("cuenta recién creada (todo null) tampoco mueve nada", () => {
    expect(
      orderHomeSections({ budgetPct: null, daysToNextCommitment: null, goalsPct: null }),
    ).toEqual(BASE);
  });

  it("un compromiso vencido manda por encima de todo", () => {
    const out = orderHomeSections({ ...tranquilo, daysToNextCommitment: -2, budgetPct: 120 });
    expect(out[0]).toBe("compromisos");
  });

  it("pasarse del presupuesto sube gastos por encima de movimientos", () => {
    const out = orderHomeSections({ ...tranquilo, budgetPct: 115 });
    expect(out[0]).toBe("gastos");
    expect(out.indexOf("gastos")).toBeLessThan(out.indexOf("movimientos"));
  });

  it("presupuesto al 80% ya reclama sitio; al 79% todavía no", () => {
    expect(orderHomeSections({ ...tranquilo, budgetPct: 80 })[0]).toBe("gastos");
    expect(orderHomeSections({ ...tranquilo, budgetPct: 79 })).toEqual(BASE);
  });

  it("una meta cumplida sube ahorros, pero no por encima de una deuda vencida", () => {
    expect(orderHomeSections({ ...tranquilo, goalsPct: 100 })[0]).toBe("ahorros");
    const out = orderHomeSections({ ...tranquilo, goalsPct: 100, daysToNextCommitment: -1 });
    expect(out[0]).toBe("compromisos");
    expect(out[1]).toBe("ahorros");
  });

  it("movimientos nunca sube: es el ancla", () => {
    const out = orderHomeSections({ budgetPct: 130, daysToNextCommitment: -5, goalsPct: 100 });
    expect(out).toEqual(["compromisos", "gastos", "ahorros", "movimientos"]);
  });

  it("el motivo desaparece y la sección vuelve a su sitio", () => {
    expect(orderHomeSections({ ...tranquilo, budgetPct: 115 })[0]).toBe("gastos");
    expect(orderHomeSections({ ...tranquilo, budgetPct: 40 })).toEqual(BASE);
  });
});
