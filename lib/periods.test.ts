import { describe, expect, it } from "vitest";
import {
  fixedPayDays,
  monthPeriods,
  nextPayDateFrom,
  nextQuincena,
  paydaysInMonthFrom,
  periodAfterN,
  quincenaForDate,
  quincenasUntil,
  stepPayDate,
  periodDaysFor,
  type PeriodDays,
} from "./periods";

describe("quincenaForDate", () => {
  it("del 1 al 15 cae en la primera quincena", () => {
    const p = quincenaForDate("2026-07-08");
    expect(p.half).toBe(1);
    expect(p.start).toBe("2026-07-01");
    expect(p.end).toBe("2026-07-15");
    expect(p.key).toBe("2026-07-Q1");
  });

  it("del 16 al último día cae en la segunda quincena", () => {
    const p = quincenaForDate("2026-07-20");
    expect(p.half).toBe(2);
    expect(p.start).toBe("2026-07-16");
    expect(p.end).toBe("2026-07-31");
    expect(p.key).toBe("2026-07-Q2");
  });

  it("la segunda quincena termina en el último día real del mes (febrero)", () => {
    const p = quincenaForDate("2026-02-20");
    expect(p.end).toBe("2026-02-28");
  });
});

describe("monthPeriods", () => {
  it("devuelve las dos quincenas de un mes", () => {
    const [q1, q2] = monthPeriods(2026, 6); // julio, 0-index
    expect(q1.key).toBe("2026-07-Q1");
    expect(q2.key).toBe("2026-07-Q2");
  });
});

describe("nextQuincena", () => {
  it("de la primera a la segunda quincena del mismo mes", () => {
    const p = nextQuincena(quincenaForDate("2026-07-05"));
    expect(p.key).toBe("2026-07-Q2");
  });

  it("de la segunda quincena de diciembre a la primera de enero del año siguiente", () => {
    const p = nextQuincena(quincenaForDate("2026-12-20"));
    expect(p.key).toBe("2027-01-Q1");
  });
});

describe("quincenasUntil / periodAfterN", () => {
  it("mínimo 1, aunque la fecha límite ya haya pasado", () => {
    expect(quincenasUntil("2026-07-08", "2026-01-01")).toBe(1);
  });

  it("cuenta cuántas quincenas quedan hasta la fecha límite", () => {
    // Desde el 8 de julio (Q1 termina el 15) hasta el 20 de agosto (Q2 de
    // agosto): jul-Q1, jul-Q2, ago-Q1, ago-Q2 → 4.
    expect(quincenasUntil("2026-07-08", "2026-08-20")).toBe(4);
  });

  it("periodAfterN es la inversa de quincenasUntil", () => {
    const n = quincenasUntil("2026-07-08", "2026-08-20");
    const p = periodAfterN("2026-07-08", n);
    expect(p.key).toBe("2026-08-Q2");
  });
});

describe("stepPayDate", () => {
  it("semanal avanza 7 días", () => {
    expect(stepPayDate("2026-07-01", "semanal")).toBe("2026-07-08");
  });

  it("quincenal avanza 15 días", () => {
    expect(stepPayDate("2026-07-01", "quincenal")).toBe("2026-07-16");
  });

  it("mensual avanza un mes calendario", () => {
    expect(stepPayDate("2026-01-31", "mensual")).toBe("2026-03-03"); // overflow de Date, comportamiento documentado del helper
  });
});

describe("stepPayDate — dias_fijos", () => {
  const d5y20: [number, number] = [5, 20];

  it("del 5 avanza al 20 del mismo mes", () => {
    expect(stepPayDate("2026-07-05", "dias_fijos", d5y20)).toBe("2026-07-20");
  });

  it("del 20 avanza al 5 del mes siguiente, NO al 4", () => {
    // Julio tiene 31 días: sumar 15 daría 2026-08-04 y de ahí en adelante la
    // fecha se iría corriendo sola. Ese es justo el bug que este modo evita.
    expect(stepPayDate("2026-07-20", "dias_fijos", d5y20)).toBe("2026-08-05");
    expect(stepPayDate("2026-07-20", "quincenal")).toBe("2026-08-04");
  });

  it("no se corre ni un día tras doce meses seguidos", () => {
    let cursor = "2026-01-05";
    for (let i = 0; i < 24; i++) cursor = stepPayDate(cursor, "dias_fijos", d5y20);
    // 24 saltos desde el 5 de enero = 12 meses completos.
    expect(cursor).toBe("2027-01-05");
  });

  it("un día que no existe en el mes cae al último día real", () => {
    // Febrero de 2026 tiene 28 días.
    expect(stepPayDate("2026-02-15", "dias_fijos", [15, 31])).toBe("2026-02-28");
  });

  it("ordena los días aunque se configuren al revés", () => {
    expect(fixedPayDays(20, 5)).toEqual([5, 20]);
    expect(fixedPayDays(5, 20)).toEqual([5, 20]);
  });

  it("acota los días fuera de rango a 1-31", () => {
    expect(fixedPayDays(0, 99)).toEqual([1, 31]);
  });
});

describe("nextPayDateFrom", () => {
  it("sin ancla, no hay próximo pago", () => {
    expect(nextPayDateFrom(null, "quincenal", "2026-07-08")).toBeNull();
  });

  it("avanza desde el ancla hasta alcanzar o pasar hoy", () => {
    expect(nextPayDateFrom("2026-06-01", "quincenal", "2026-07-08")).toBe("2026-07-16");
  });

  it("si el ancla ya es futura, la devuelve tal cual", () => {
    expect(nextPayDateFrom("2026-08-01", "mensual", "2026-07-08")).toBe("2026-08-01");
  });
});

describe("paydaysInMonthFrom", () => {
  it("sin ancla, no hay fechas de pago", () => {
    expect(paydaysInMonthFrom(2026, 6, null, "quincenal")).toEqual([]);
  });

  it("lista las fechas de pago quincenal dentro del mes visible", () => {
    const dates = paydaysInMonthFrom(2026, 6, "2026-01-01", "quincenal");
    for (const d of dates) {
      expect(d >= "2026-07-01" && d <= "2026-07-31").toBe(true);
    }
    expect(dates.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Períodos anclados a los días de cobro (ej. cobra el 5 y el 20).
// ─────────────────────────────────────────────────────────────────────────
describe("quincenaForDate con días de cobro propios", () => {
  const d: PeriodDays = [5, 20];

  it("el propio día de cobro abre período", () => {
    const p = quincenaForDate("2026-08-05", d);
    expect([p.start, p.end, p.half]).toEqual(["2026-08-05", "2026-08-19", 1]);
  });

  it("la víspera del segundo cobro sigue en el primer período", () => {
    expect(quincenaForDate("2026-08-19", d).half).toBe(1);
  });

  it("el segundo período CRUZA al mes siguiente", () => {
    const p = quincenaForDate("2026-08-20", d);
    expect([p.start, p.end, p.half]).toEqual(["2026-08-20", "2026-09-04", 2]);
  });

  it("los días previos al primer cobro son del período del mes ANTERIOR", () => {
    const p = quincenaForDate("2026-09-03", d);
    expect([p.start, p.end, p.month]).toEqual(["2026-08-20", "2026-09-04", 7]);
  });

  it("cruza el año: el 2 de enero pertenece al período que abrió en diciembre", () => {
    const p = quincenaForDate("2027-01-02", d);
    expect([p.start, p.end, p.year]).toEqual(["2026-12-20", "2027-01-04", 2026]);
  });

  it("un día de cobro que no existe en el mes cae al último día real", () => {
    const p = quincenaForDate("2026-02-28", [10, 31]);
    expect([p.start, p.end]).toEqual(["2026-02-28", "2026-03-09"]);
  });

  it("cada fecha cae en exactamente un período, sin huecos ni solapes", () => {
    let cursor = quincenaForDate("2026-01-01", d);
    for (let i = 0; i < 24; i++) {
      const siguiente = nextQuincena(cursor, d);
      // El siguiente arranca justo al día después de que termina el actual.
      const finMasUno = new Date(`${cursor.end}T12:00:00`);
      finMasUno.setDate(finMasUno.getDate() + 1);
      expect(siguiente.start).toBe(finMasUno.toISOString().slice(0, 10));
      cursor = siguiente;
    }
  });

  it("con los días por defecto el resultado es el de siempre", () => {
    expect(quincenaForDate("2026-08-10", [1, 16])).toEqual(quincenaForDate("2026-08-10"));
    expect(quincenaForDate("2026-08-20", [1, 16])).toEqual(quincenaForDate("2026-08-20"));
  });

  it("la etiqueta dice los dos meses cuando el período cruza", () => {
    expect(quincenaForDate("2026-08-20", d).label).toBe("20 ago – 4 sept 2026");
    expect(quincenaForDate("2026-08-05", d).label).toBe("5–19 ago 2026");
  });
});

describe("periodDaysFor", () => {
  const base = { pay_day_1: 5, pay_day_2: 20 };

  it("solo 'dias_fijos' ancla los períodos", () => {
    expect(periodDaysFor({ ...base, frequency: "dias_fijos" })).toEqual([5, 20]);
    expect(periodDaysFor({ ...base, frequency: "quincenal" })).toEqual([1, 16]);
    expect(periodDaysFor({ ...base, frequency: "semanal" })).toEqual([1, 16]);
    expect(periodDaysFor({ ...base, frequency: "mensual" })).toEqual([1, 16]);
  });

  it("sin ajustes, las mitades del calendario", () => {
    expect(periodDaysFor(null)).toEqual([1, 16]);
  });

  it("dos días iguales no forman dos períodos: cae al modelo de siempre", () => {
    expect(periodDaysFor({ frequency: "dias_fijos", pay_day_1: 12, pay_day_2: 12 })).toEqual([1, 16]);
  });

  it("los ordena si vienen al revés", () => {
    expect(periodDaysFor({ frequency: "dias_fijos", pay_day_1: 20, pay_day_2: 5 })).toEqual([5, 20]);
  });
});

describe("caso real: cobra el 5 y el 20", () => {
  const d: PeriodDays = [5, 20];

  it("el 4 de agosto todavía pertenece al período que abrió el 20 de julio", () => {
    const p = quincenaForDate("2026-08-04", d);
    expect(p.start).toBe("2026-07-20");
    expect(p.end).toBe("2026-08-04");
    expect(p.label).toBe("20 jul – 4 ago 2026");
  });

  it("el 5 de agosto abre período nuevo, no el 1", () => {
    expect(quincenaForDate("2026-08-05", d).start).toBe("2026-08-05");
    // Lo que rompía antes: con el modelo viejo, el 1 de agosto ya era período
    // nuevo aunque el sueldo no entrara hasta el 5.
    expect(quincenaForDate("2026-08-01", d).start).toBe("2026-07-20");
  });

  it("el presupuesto NO se reinicia el 16, cinco días antes de cobrar", () => {
    expect(quincenaForDate("2026-08-16", d).start).toBe("2026-08-05");
    expect(quincenaForDate("2026-08-19", d).start).toBe("2026-08-05");
    expect(quincenaForDate("2026-08-20", d).start).toBe("2026-08-20");
  });
});
