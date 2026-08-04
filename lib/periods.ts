// Cálculo de quincenas y próximos pagos de sueldo.
//
// Modelo: dos periodos por mes, que ARRANCAN EN LOS DÍAS DE COBRO.
//   Con días [1, 16]  → 1–15 y 16–fin de mes (el modelo histórico).
//   Con días [5, 20]  → 5–19 y 20–4 del mes SIGUIENTE.
//
// Antes las quincenas eran siempre las mitades del calendario y los días de
// cobro solo servían para pintar el "próximo pago". Para quien cobra el 5 y el
// 20 eso partía su plata por la mitad equivocada: el presupuesto se reiniciaba
// el día 16, cinco días antes de que entrara el sueldo, así que arrastraba
// gastos de un cobro al período del siguiente.
//
// La consecuencia gorda del cambio: un período puede CRUZAR DE MES (20 ago →
// 4 sep). `year`/`month` son los del ARRANQUE, no los del final.

import { parseISODate, toISODate } from "./format";
import type { PayFrequency, SalarySettings } from "./types";

/** Los dos días del mes en los que arranca un período. */
export type PeriodDays = [number, number];

/** Las mitades del calendario: el comportamiento de siempre. Es lo que se usa
 *  mientras el usuario no configure días de cobro fijos. */
export const DEFAULT_PERIOD_DAYS: PeriodDays = [1, 16];

export interface Period {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  half: 1 | 2;
  /** Año y mes del ARRANQUE. Un período puede terminar en el mes siguiente. */
  year: number;
  month: number; // 0-index
  label: string; // "1–15 jul 2026" · "20 ago – 4 sep 2026" si cruza de mes
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

/** El día `day` dentro de ese mes, sin inventar fechas que no existen: si el
 *  usuario configuró el 31 y el mes tiene 30, cae en el último día real.
 *  Acepta meses fuera de 0-11 (el Date de JS ya normaliza el desbordamiento),
 *  que es lo que deja pedir "el día 5 del mes que viene" sin ramificar. */
function dayInMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), 12);
}

/** El día ANTERIOR al arranque del siguiente período. Se calcula restando un
 *  día en vez de con aritmética sobre el número, porque así sale solo el caso
 *  de [1, 16] —el día antes del 1 del mes que viene es el último de este— y el
 *  de los meses cortos, sin ramificar. */
function dayBefore(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - 1);
  return x;
}

function makePeriod(year: number, month: number, half: 1 | 2, days: PeriodDays): Period {
  const [d1, d2] = days;
  const startDate = half === 1 ? dayInMonth(year, month, d1) : dayInMonth(year, month, d2);
  // El período termina justo antes de que arranque el siguiente.
  const endDate =
    half === 1
      ? dayBefore(dayInMonth(year, month, d2))
      : dayBefore(dayInMonth(year, month + 1, d1));

  const mes = (d: Date) => monthShort().format(d).replace(".", "");
  const cruzaDeMes = startDate.getMonth() !== endDate.getMonth();
  const label = cruzaDeMes
    ? `${startDate.getDate()} ${mes(startDate)} – ${endDate.getDate()} ${mes(endDate)} ${endDate.getFullYear()}`
    : `${startDate.getDate()}–${endDate.getDate()} ${mes(startDate)} ${year}`;

  return {
    start: toISODate(startDate),
    end: toISODate(endDate),
    half,
    year,
    month,
    label,
    key: `${year}-${String(month + 1).padStart(2, "0")}-Q${half}`,
  };
}

/** Quincena que contiene la fecha dada. */
export function quincenaForDate(iso: string, days: PeriodDays = DEFAULT_PERIOD_DAYS): Period {
  const d = parseISODate(iso);
  const [d1, d2] = days;
  const day = d.getDate();
  const y = d.getFullYear();
  const m = d.getMonth();

  /* Se compara contra los días YA RECORTADOS al mes real, no contra los
     configurados. Si no, un día de cobro 31 en febrero dejaba un hueco: el 28
     no llegaba a "day >= 31" y caía en el primer período, que ya había
     terminado el 27 — esa fecha se quedaba sin período ninguno. */
  const ultimo = new Date(y, m + 1, 0).getDate();
  const c1 = Math.min(d1, ultimo);
  const c2 = Math.min(d2, ultimo);

  if (day >= c2) return makePeriod(y, m, 2, days);
  if (day >= c1) return makePeriod(y, m, 1, days);
  // Antes del primer día de cobro del mes: seguimos dentro del SEGUNDO período
  // del mes pasado, que cruzó la frontera (ej. el 3 de agosto con días [5,20]
  // pertenece al 20 jul – 4 ago). Con [1,16] esta rama no se alcanza nunca.
  return makePeriod(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, 2, days);
}

/** Las dos quincenas que ARRANCAN en un mes. */
export function monthPeriods(
  year: number,
  month: number,
  days: PeriodDays = DEFAULT_PERIOD_DAYS,
): [Period, Period] {
  return [makePeriod(year, month, 1, days), makePeriod(year, month, 2, days)];
}

/** Quincena siguiente a la dada. */
export function nextQuincena(p: Period, days: PeriodDays = DEFAULT_PERIOD_DAYS): Period {
  if (p.half === 1) return makePeriod(p.year, p.month, 2, days);
  const nextMonth = p.month === 11 ? 0 : p.month + 1;
  const nextYear = p.month === 11 ? p.year + 1 : p.year;
  return makePeriod(nextYear, nextMonth, 1, days);
}

/** Cuántas quincenas quedan (incluyendo la actual) hasta una fecha límite.
 *  Mínimo 1 — siempre queda al menos la quincena en curso para aportar. */
export function quincenasUntil(
  todayISO: string,
  deadlineISO: string,
  days: PeriodDays = DEFAULT_PERIOD_DAYS,
): number {
  let p = quincenaForDate(todayISO, days);
  let count = 1;
  while (p.end < deadlineISO && count < 1000) {
    p = nextQuincena(p, days);
    count++;
  }
  return count;
}

/** Inversa de quincenasUntil: la quincena que queda tras avanzar n
 *  quincenas completas desde hoy (n=1 → la quincena en curso). */
export function periodAfterN(
  todayISO: string,
  n: number,
  days: PeriodDays = DEFAULT_PERIOD_DAYS,
): Period {
  let p = quincenaForDate(todayISO, days);
  for (let i = 1; i < n; i++) p = nextQuincena(p, days);
  return p;
}

/** Los dos días del mes de la frecuencia 'dias_fijos', ya ordenados y
 *  acotados a 1-31. Se reusan `pay_day_1`/`pay_day_2` de salary_settings, que
 *  existían desde el schema original y se habían deprecado en migration-v6
 *  con la razón "no todo el mundo cobra los días 15 y 30 fijos" — cierto,
 *  pero quien SÍ cobra en días fijos necesita justo esto. */
export function fixedPayDays(day1: number, day2: number): [number, number] {
  const clamp = (n: number) => Math.min(31, Math.max(1, Math.round(Number(n) || 1)));
  const a = clamp(day1);
  const b = clamp(day2);
  return a <= b ? [a, b] : [b, a];
}

/** Los días que abren período para este usuario.
 *
 *  Solo los días de cobro fijos pueden anclar un período: el resto de
 *  frecuencias no cae en el mismo día del mes. 'quincenal' avanza cada 15
 *  días, así que se desplaza mes a mes y puede dar tres cobros en un mes;
 *  'semanal' y 'mensual' ni siquiera son dos períodos. En todas ellas se
 *  mantienen las mitades del calendario, que es lo que había.
 *
 *  Si los dos días coinciden, no hay dos períodos que formar y se cae al
 *  modelo de siempre en vez de producir un período de longitud cero. */
export function periodDaysFor(
  settings: Pick<SalarySettings, "frequency" | "pay_day_1" | "pay_day_2"> | null | undefined,
): PeriodDays {
  if (!settings || settings.frequency !== "dias_fijos") return DEFAULT_PERIOD_DAYS;
  const [d1, d2] = fixedPayDays(settings.pay_day_1, settings.pay_day_2);
  return d1 === d2 ? DEFAULT_PERIOD_DAYS : [d1, d2];
}

/** Avanza una fecha ISO un período de la frecuencia de cobro dada.
 *  "Quincenal" es cada 15 días desde el ancla que el usuario eligió — no
 *  "los días 15 y 30", que no siempre coincide con cómo cobra cada quien.
 *  Para quien sí cobra en días fijos del mes está 'dias_fijos', que avanza
 *  por calendario real: sumar 15 días a un día 20 cae en el 4 del mes
 *  siguiente en los meses de 31, y la fecha se va corriendo sola. */
export function stepPayDate(iso: string, freq: PayFrequency, days?: [number, number]): string {
  const d = parseISODate(iso);
  if (freq === "dias_fijos") {
    const [d1, d2] = days ?? [15, 30];
    const day = d.getDate();
    const y = d.getFullYear();
    const m = d.getMonth();
    if (day < d1) return toISODate(dayInMonth(y, m, d1));
    if (day < d2) return toISODate(dayInMonth(y, m, d2));
    return toISODate(dayInMonth(y, m + 1, d1));
  }
  if (freq === "semanal") d.setDate(d.getDate() + 7);
  else if (freq === "quincenal") d.setDate(d.getDate() + 15);
  else d.setMonth(d.getMonth() + 1);
  return toISODate(d);
}

/** Inversa de stepPayDate: retrocede una fecha ISO un período. */
function stepPayDateBack(iso: string, freq: PayFrequency, days?: [number, number]): string {
  const d = parseISODate(iso);
  if (freq === "dias_fijos") {
    const [d1, d2] = days ?? [15, 30];
    const day = d.getDate();
    const y = d.getFullYear();
    const m = d.getMonth();
    if (day > d2) return toISODate(dayInMonth(y, m, d2));
    if (day > d1) return toISODate(dayInMonth(y, m, d1));
    return toISODate(dayInMonth(y, m - 1, d2));
  }
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
  days?: [number, number],
): string | null {
  if (!anchorISO) return null;
  let d = anchorISO;
  let guard = 0;
  while (d < todayISO && guard < 2000) {
    d = stepPayDate(d, freq, days);
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
  days?: [number, number],
): string[] {
  if (!anchorISO) return [];
  const monthStart = toISODate(new Date(year, month, 1, 12));
  const monthEnd = toISODate(new Date(year, month + 1, 0, 12));

  let cursor = anchorISO;
  let guard = 0;
  while (cursor > monthEnd && guard < 2000) {
    cursor = stepPayDateBack(cursor, freq, days);
    guard++;
  }
  while (cursor < monthStart && guard < 2000) {
    cursor = stepPayDate(cursor, freq, days);
    guard++;
  }

  const dates: string[] = [];
  while (cursor <= monthEnd && guard < 2000) {
    dates.push(cursor);
    cursor = stepPayDate(cursor, freq, days);
    guard++;
  }
  return dates;
}
