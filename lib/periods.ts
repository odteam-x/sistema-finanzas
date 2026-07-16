// Cálculo de quincenas y próximos pagos de sueldo.
//
// Modelo: dos periodos por mes (quincenas).
//   Q1 = del 1 al 15
//   Q2 = del 16 al último día del mes
// Los "días de pago" (pay_day_1 / pay_day_2) son configurables y se usan
// para mostrar el "próximo pago"; el conteo de días trabajados usa las
// mitades del mes, que es como se organiza el gasto diario.

import { parseISODate, toISODate } from "./format";
import type { PayFrequency } from "./types";

export interface Period {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  half: 1 | 2;
  year: number;
  month: number; // 0-index
  label: string; // "1–15 jul 2026"
  key: string; // "2026-07-Q1"
}

let _monthShort: Intl.DateTimeFormat | null = null;
function monthShort(): Intl.DateTimeFormat {
  if (!_monthShort) {
    try {
      _monthShort = new Intl.DateTimeFormat("es-DO", { month: "short" });
    } catch {
      _monthShort = new Intl.DateTimeFormat("en-US", { month: "short" });
    }
  }
  return _monthShort;
}

function makePeriod(year: number, month: number, half: 1 | 2): Period {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const start = half === 1 ? 1 : 16;
  const end = half === 1 ? 15 : lastDay;
  const mLabel = monthShort().format(new Date(year, month, 1, 12)).replace(".", "");
  return {
    start: toISODate(new Date(year, month, start, 12)),
    end: toISODate(new Date(year, month, end, 12)),
    half,
    year,
    month,
    label: `${start}–${end} ${mLabel} ${year}`,
    key: `${year}-${String(month + 1).padStart(2, "0")}-Q${half}`,
  };
}

/** Quincena que contiene la fecha dada. */
export function quincenaForDate(iso: string): Period {
  const d = parseISODate(iso);
  const half: 1 | 2 = d.getDate() <= 15 ? 1 : 2;
  return makePeriod(d.getFullYear(), d.getMonth(), half);
}

/** Las dos quincenas de un mes. */
export function monthPeriods(year: number, month: number): [Period, Period] {
  return [makePeriod(year, month, 1), makePeriod(year, month, 2)];
}

/** Quincena siguiente a la dada. */
export function nextQuincena(p: Period): Period {
  if (p.half === 1) return makePeriod(p.year, p.month, 2);
  const nextMonth = p.month === 11 ? 0 : p.month + 1;
  const nextYear = p.month === 11 ? p.year + 1 : p.year;
  return makePeriod(nextYear, nextMonth, 1);
}

/** Cuántas quincenas quedan (incluyendo la actual) hasta una fecha límite.
 *  Mínimo 1 — siempre queda al menos la quincena en curso para aportar. */
export function quincenasUntil(todayISO: string, deadlineISO: string): number {
  let p = quincenaForDate(todayISO);
  let count = 1;
  while (p.end < deadlineISO && count < 1000) {
    p = nextQuincena(p);
    count++;
  }
  return count;
}

/** Inversa de quincenasUntil: la quincena que queda tras avanzar n
 *  quincenas completas desde hoy (n=1 → la quincena en curso). */
export function periodAfterN(todayISO: string, n: number): Period {
  let p = quincenaForDate(todayISO);
  for (let i = 1; i < n; i++) p = nextQuincena(p);
  return p;
}

/** Avanza una fecha ISO un período de la frecuencia de cobro dada.
 *  "Quincenal" es cada 15 días desde el ancla que el usuario eligió — no
 *  "los días 15 y 30", que no siempre coincide con cómo cobra cada quien. */
export function stepPayDate(iso: string, freq: PayFrequency): string {
  const d = parseISODate(iso);
  if (freq === "semanal") d.setDate(d.getDate() + 7);
  else if (freq === "quincenal") d.setDate(d.getDate() + 15);
  else d.setMonth(d.getMonth() + 1);
  return toISODate(d);
}

/** Inversa de stepPayDate: retrocede una fecha ISO un período. */
function stepPayDateBack(iso: string, freq: PayFrequency): string {
  const d = parseISODate(iso);
  if (freq === "semanal") d.setDate(d.getDate() - 7);
  else if (freq === "quincenal") d.setDate(d.getDate() - 15);
  else d.setMonth(d.getMonth() - 1);
  return toISODate(d);
}

/** Próxima fecha de pago (>= hoy), avanzando desde el ancla configurada
 *  por la frecuencia elegida. Sin ancla, no hay próximo pago que calcular. */
export function nextPayDateFrom(
  anchorISO: string | null,
  freq: PayFrequency,
  todayISO: string,
): string | null {
  if (!anchorISO) return null;
  let d = anchorISO;
  let guard = 0;
  while (d < todayISO && guard < 2000) {
    d = stepPayDate(d, freq);
    guard++;
  }
  return d;
}

/** Fechas de pago dentro de un mes visible dado, según ancla + frecuencia
 *  (para pintarlas en el Calendario, sea el mes pasado, actual o futuro). */
export function paydaysInMonthFrom(
  year: number,
  month: number,
  anchorISO: string | null,
  freq: PayFrequency,
): string[] {
  if (!anchorISO) return [];
  const monthStart = toISODate(new Date(year, month, 1, 12));
  const monthEnd = toISODate(new Date(year, month + 1, 0, 12));

  let cursor = anchorISO;
  let guard = 0;
  while (cursor > monthEnd && guard < 2000) {
    cursor = stepPayDateBack(cursor, freq);
    guard++;
  }
  while (cursor < monthStart && guard < 2000) {
    cursor = stepPayDate(cursor, freq);
    guard++;
  }

  const dates: string[] = [];
  while (cursor <= monthEnd && guard < 2000) {
    dates.push(cursor);
    cursor = stepPayDate(cursor, freq);
    guard++;
  }
  return dates;
}
