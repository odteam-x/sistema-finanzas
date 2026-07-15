// Cálculo de quincenas y próximos pagos de sueldo.
//
// Modelo: dos periodos por mes (quincenas).
//   Q1 = del 1 al 15
//   Q2 = del 16 al último día del mes
// Los "días de pago" (pay_day_1 / pay_day_2) son configurables y se usan
// para mostrar el "próximo pago"; el conteo de días trabajados usa las
// mitades del mes, que es como se organiza el gasto diario.

import { parseISODate, toISODate } from "./format";

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

/**
 * Próxima fecha de pago (>= hoy) según los días de pago configurados.
 * payDay2 = 31 se interpreta como "último día del mes".
 */
export function nextPayDate(
  todayISO: string,
  payDay1: number,
  payDay2: number,
): string {
  const today = parseISODate(todayISO);
  const candidates: Date[] = [];
  for (let offset = 0; offset <= 2; offset++) {
    const y = today.getFullYear();
    const m = today.getMonth() + offset;
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (const day of [payDay1, payDay2]) {
      const realDay = Math.min(day, lastDay);
      candidates.push(new Date(y, m, realDay, 12));
    }
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());
  const next = candidates.find((d) => d.getTime() >= today.getTime());
  return toISODate(next ?? candidates[0]);
}

/**
 * Fechas de pago (payDay1/payDay2) dentro de un mes dado, como ISO.
 * payDay2 = 31 se interpreta como "último día del mes" (mismo clamp que nextPayDate).
 */
export function paydaysInMonth(year: number, month: number, payDay1: number, payDay2: number): string[] {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const days = Array.from(new Set([Math.min(payDay1, lastDay), Math.min(payDay2, lastDay)]));
  return days.sort((a, b) => a - b).map((day) => toISODate(new Date(year, month, day, 12)));
}
