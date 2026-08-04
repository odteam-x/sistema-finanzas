import { describe, it, expect } from "vitest";
import { payoutTotals, itemsDueBefore, type PayoutItem } from "./payoutPlan";

const item = (id: string, amount: number, date: string): PayoutItem => ({
  id,
  name: id,
  amount,
  date,
  kind: "debt",
  overdue: false,
});

describe("payoutTotals", () => {
  const items = [item("a", 3000, "2026-08-22"), item("b", 1200, "2026-08-25")];

  it("resta todo lo comprometido cuando no se excluye nada", () => {
    const t = payoutTotals(10000, items, [], 15);
    expect(t.comprometido).toBe(4200);
    expect(t.neto).toBe(5800);
  });

  it("excluir un compromiso lo saca de la cuenta", () => {
    expect(payoutTotals(10000, items, ["a"], 15).neto).toBe(8800);
  });

  it("excluirlos todos deja el cobro íntegro", () => {
    expect(payoutTotals(10000, items, ["a", "b"], 15).neto).toBe(10000);
  });

  it("un id excluido que no existe no rompe nada", () => {
    expect(payoutTotals(10000, items, ["zzz"], 15).neto).toBe(5800);
  });

  it("el neto puede quedar NEGATIVO y no se recorta a cero", () => {
    const t = payoutTotals(3000, items, [], 15);
    expect(t.neto).toBe(-1200);
  });

  it("reparte el neto entre los días que faltan", () => {
    expect(payoutTotals(10000, items, [], 10).porDia).toBeCloseTo(580);
  });

  it("sin días que repartir, no inventa un por-día", () => {
    expect(payoutTotals(10000, items, [], 0).porDia).toBeNull();
  });

  it("sin compromisos, el neto es el cobro entero", () => {
    expect(payoutTotals(10000, [], [], 15)).toEqual({
      comprometido: 0,
      neto: 10000,
      porDia: 10000 / 15,
    });
  });
});

describe("itemsDueBefore", () => {
  const hoy = "2026-08-20";
  const proximoCobro = "2026-09-05";
  const items = [
    item("vencida", 500, "2026-08-10"),
    item("dentro", 3000, "2026-08-22"),
    item("justo-antes", 800, "2026-09-04"),
    item("el-dia-del-cobro", 900, "2026-09-05"),
    item("despues", 1500, "2026-09-20"),
  ];

  it("incluye lo que vence antes del próximo cobro", () => {
    const ids = itemsDueBefore(items, hoy, proximoCobro).map((i) => i.id);
    expect(ids).toContain("dentro");
    expect(ids).toContain("justo-antes");
  });

  it("lo que vence EL día del próximo cobro ya lo cubre ese cobro, no este", () => {
    const ids = itemsDueBefore(items, hoy, proximoCobro).map((i) => i.id);
    expect(ids).not.toContain("el-dia-del-cobro");
    expect(ids).not.toContain("despues");
  });

  it("arrastra lo ya vencido y lo marca", () => {
    const out = itemsDueBefore(items, hoy, proximoCobro);
    const vencida = out.find((i) => i.id === "vencida");
    expect(vencida?.overdue).toBe(true);
  });

  it("lo que aún no vence no se marca como vencido", () => {
    const out = itemsDueBefore(items, hoy, proximoCobro);
    expect(out.find((i) => i.id === "dentro")?.overdue).toBe(false);
  });

  it("sale ordenado por fecha, lo vencido primero", () => {
    const ids = itemsDueBefore(items, hoy, proximoCobro).map((i) => i.id);
    expect(ids).toEqual(["vencida", "dentro", "justo-antes"]);
  });

  it("no muta la lista original", () => {
    const antes = items.map((i) => i.overdue);
    itemsDueBefore(items, hoy, proximoCobro);
    expect(items.map((i) => i.overdue)).toEqual(antes);
  });
});
