import { describe, it, expect } from "vitest";
import { TIPS, orderTips, type TipSituation } from "./tips";

/** Usuario que ya lo tiene todo montado: ninguna señal dispara relevancia. */
const alDia: TipSituation = {
  hasDebt: false,
  hasGoals: true,
  hasSavings: true,
  hasBudget: true,
  logsExpenses: true,
  overBudget: false,
};

const keys = (s: TipSituation, seen: string[] = []) => orderTips(s, seen).map((t) => t.key);

describe("orderTips", () => {
  it("no pierde ni duplica consejos", () => {
    const out = orderTips(alDia);
    expect(out).toHaveLength(TIPS.length);
    expect(new Set(out.map((t) => t.key)).size).toBe(TIPS.length);
  });

  it("no muta el array original", () => {
    const antes = TIPS.map((t) => t.key);
    orderTips({ ...alDia, hasDebt: true });
    expect(TIPS.map((t) => t.key)).toEqual(antes);
  });

  it("sin señales, respeta el orden del archivo", () => {
    expect(keys(alDia)).toEqual(TIPS.map((t) => t.key));
  });

  it("con deuda, la deuda cara sube a lo más alto", () => {
    expect(keys({ ...alDia, hasDebt: true })[0]).toBe("deuda-cara");
  });

  it("quien no registra gastos ve primero cómo empezar", () => {
    expect(keys({ ...alDia, logsExpenses: false })[0]).toBe("registrar-gastos");
  });

  it("sin metas, 'Metas concretas' sube; con metas, no", () => {
    expect(keys({ ...alDia, hasGoals: false }).indexOf("metas-concretas")).toBe(0);
    expect(keys(alDia).indexOf("metas-concretas")).toBe(TIPS.length - 1);
  });

  it("cuenta nueva: lo básico arriba y el marco general antes que el resto", () => {
    const nuevo: TipSituation = {
      hasDebt: false,
      hasGoals: false,
      hasSavings: false,
      hasBudget: false,
      logsExpenses: false,
      overBudget: false,
    };
    const orden = keys(nuevo);
    expect(orden[0]).toBe("registrar-gastos");
    expect(orden.indexOf("50-30-20")).toBeLessThan(orden.indexOf("compras-impulsivas"));
  });

  it("lo ya leído baja al final aunque encaje con la situación", () => {
    const orden = keys({ ...alDia, hasDebt: true }, ["deuda-cara"]);
    expect(orden[0]).not.toBe("deuda-cara");
    expect(orden[orden.length - 1]).toBe("deuda-cara");
  });

  it("entre varios leídos, el más relevante queda por encima", () => {
    // deuda-cara puntúa 4 con deuda; pagate-primero puntúa 2 sin ahorros.
    // Bajar por leídos no debe aplanar esa diferencia entre ellos.
    const situacion = { ...alDia, hasDebt: true, hasSavings: false };
    const orden = keys(situacion, ["deuda-cara", "pagate-primero"]);
    expect(orden.indexOf("deuda-cara")).toBeLessThan(orden.indexOf("pagate-primero"));
    expect(orden.slice(-2).sort()).toEqual(["deuda-cara", "pagate-primero"]);
  });

  it("leerlos todos deja el orden del archivo, no un revoltijo", () => {
    expect(keys(alDia, TIPS.map((t) => t.key))).toEqual(TIPS.map((t) => t.key));
  });
});
