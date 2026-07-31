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
