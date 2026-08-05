import { describe, it, expect } from "vitest";
import {
  orderSituationTiles,
  situationHighlight,
  type SituationSignals,
  type SituationTile,
} from "./situationHighlight";

const BASE: SituationTile[] = ["ahorrado", "adeudado", "proximoPago", "proximaDeuda"];

/** Cuenta tranquila: sin deudas, el cobro lejos. Ninguna señal dispara. */
const tranquilo: SituationSignals = {
  daysToDue: null,
  outstandingDebt: 0,
  daysToPay: 9,
  totalSaved: 40000,
};

describe("orderSituationTiles", () => {
  it("no pierde ni duplica datos", () => {
    const out = orderSituationTiles(tranquilo);
    expect(out).toHaveLength(BASE.length);
    expect(new Set(out).size).toBe(BASE.length);
  });

  it("sin señales activas, el orden de siempre", () => {
    expect(orderSituationTiles(tranquilo)).toEqual(BASE);
  });

  it("cuenta recién creada, con todo en cero, tampoco mueve nada", () => {
    expect(
      orderSituationTiles({ daysToDue: null, outstandingDebt: 0, daysToPay: 12, totalSaved: 0 }),
    ).toEqual(BASE);
  });

  it("una deuda vencida gana a todo lo demás", () => {
    const out = orderSituationTiles({
      ...tranquilo,
      daysToDue: -2,
      outstandingDebt: 5000,
      daysToPay: 0,
    });
    expect(out[0]).toBe("proximaDeuda");
  });

  it("una deuda que vence en 3 días o menos también sube", () => {
    expect(orderSituationTiles({ ...tranquilo, daysToDue: 3 })[0]).toBe("proximaDeuda");
    expect(orderSituationTiles({ ...tranquilo, daysToDue: 4 })).toEqual(BASE);
  });

  it("el día de cobro sube, pero por debajo de una deuda vencida", () => {
    expect(orderSituationTiles({ ...tranquilo, daysToPay: 0 })[0]).toBe("proximoPago");
    const out = orderSituationTiles({ ...tranquilo, daysToPay: 0, daysToDue: -1 });
    expect(out[0]).toBe("proximaDeuda");
    expect(out[1]).toBe("proximoPago");
  });

  it("cobrar mañana pesa menos que cobrar hoy", () => {
    const hoy = orderSituationTiles({ ...tranquilo, daysToPay: 0 });
    const manana = orderSituationTiles({ ...tranquilo, daysToPay: 1 });
    expect(hoy[0]).toBe("proximoPago");
    expect(manana[0]).toBe("proximoPago");
    // Con deuda pendiente, cobrar mañana sigue ganando: deber es un estado, no
    // un evento del día.
    expect(
      orderSituationTiles({ ...tranquilo, daysToPay: 1, outstandingDebt: 5000 })[0],
    ).toBe("proximoPago");
  });

  it("deber dinero solo sube cuando no hay ninguna fecha reclamando", () => {
    expect(orderSituationTiles({ ...tranquilo, outstandingDebt: 5000 })[0]).toBe("adeudado");
    // Pero pierde contra cualquier fecha accionable.
    expect(
      orderSituationTiles({ ...tranquilo, outstandingDebt: 5000, daysToDue: 1 })[0],
    ).toBe("proximaDeuda");
  });

  it("'ahorrado' nunca sube: es el ancla", () => {
    const out = orderSituationTiles({
      daysToDue: -5,
      outstandingDebt: 90000,
      daysToPay: 0,
      totalSaved: 500000,
    });
    expect(out).toEqual(["proximaDeuda", "proximoPago", "adeudado", "ahorrado"]);
  });

  it("el motivo desaparece y el orden vuelve al de siempre", () => {
    expect(orderSituationTiles({ ...tranquilo, daysToDue: -1 })[0]).toBe("proximaDeuda");
    expect(orderSituationTiles(tranquilo)).toEqual(BASE);
  });
});

describe("situationHighlight", () => {
  it("es el primero del orden", () => {
    const s: SituationSignals = { ...tranquilo, daysToDue: -1 };
    expect(situationHighlight(s)).toBe(orderSituationTiles(s)[0]);
  });

  it("sin nada que reclamar, destaca el ahorro", () => {
    expect(situationHighlight(tranquilo)).toBe("ahorrado");
  });
});
