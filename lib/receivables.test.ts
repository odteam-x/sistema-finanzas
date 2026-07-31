import { describe, expect, it } from "vitest";
import { collectedOf, isCollected, pendingOf, totalPending } from "./receivables";
import type { Receivable, ReceivableInstallment } from "./types";

function receivable(overrides: Partial<Receivable>): Receivable {
  return {
    id: "r1",
    user_id: "u",
    kind: "cobro",
    name: "Cobro",
    total_amount: 500,
    acquired_date: "2026-01-01",
    due_date: null,
    payment_type: "unico",
    installments_count: null,
    installment_amount: null,
    frequency: null,
    status: "pendiente",
    note: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function installment(overrides: Partial<ReceivableInstallment>): ReceivableInstallment {
  return {
    id: "i1",
    receivable_id: "r1",
    user_id: "u",
    seq: 1,
    due_date: "2026-02-01",
    amount: 100,
    paid: false,
    paid_date: null,
    ...overrides,
  };
}

describe("collectedOf", () => {
  it("pago único: todo o nada según el estado", () => {
    expect(collectedOf(receivable({ payment_type: "unico", total_amount: 500, status: "cobrada" }), [])).toBe(500);
    expect(collectedOf(receivable({ payment_type: "unico", total_amount: 500, status: "pendiente" }), [])).toBe(0);
  });

  it("en cuotas, suma solo las marcadas cobradas de ESE receivable", () => {
    const installments = [
      installment({ receivable_id: "r1", amount: 100, paid: true }),
      installment({ receivable_id: "r1", amount: 100, paid: false }),
      installment({ receivable_id: "otro", amount: 999, paid: true }),
    ];
    expect(collectedOf(receivable({ payment_type: "cuotas" }), installments)).toBe(100);
  });
});

describe("pendingOf", () => {
  it("resta lo cobrado del total y nunca es negativo", () => {
    const r = receivable({ payment_type: "unico", total_amount: 300, status: "cobrada" });
    expect(pendingOf(r, [])).toBe(0);
  });
});

describe("isCollected", () => {
  it("true cuando no queda nada por cobrar", () => {
    const r = receivable({ payment_type: "unico", total_amount: 100, status: "cobrada" });
    expect(isCollected(r, [])).toBe(true);
  });

  it("false mientras falte algo por cobrar", () => {
    const r = receivable({ payment_type: "unico", total_amount: 100, status: "pendiente" });
    expect(isCollected(r, [])).toBe(false);
  });
});

describe("totalPending", () => {
  it("suma lo pendiente de todos los receivables", () => {
    const receivables = [
      receivable({ id: "r1", total_amount: 100, status: "pendiente" }),
      receivable({ id: "r2", total_amount: 200, status: "pendiente" }),
    ];
    expect(totalPending(receivables, [])).toBe(300);
  });

  it("filtra por kind cuando se pasa", () => {
    const receivables = [
      receivable({ id: "r1", kind: "cobro", total_amount: 100, status: "pendiente" }),
      receivable({ id: "r2", kind: "prestamo", total_amount: 200, status: "pendiente" }),
    ];
    expect(totalPending(receivables, [], "prestamo")).toBe(200);
  });
});
