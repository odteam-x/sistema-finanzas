// Lógica del calendario laboral.
// Regla base: se trabaja de lunes a sábado; el domingo es libre fijo.
// Las excepciones (feriado / libre / trabajado) modifican esa regla base.

import { parseISODate, toISODate } from "./format";
import type { ExceptionKind, WorkException } from "./types";

export type DayStatus = "trabajo" | "domingo" | "feriado" | "libre";

/** Mapa "YYYY-MM-DD" -> excepción, para búsquedas O(1). */
export function exceptionsMap(
  exceptions: WorkException[],
): Map<string, ExceptionKind> {
  const m = new Map<string, ExceptionKind>();
  for (const e of exceptions) m.set(e.date, e.kind);
  return m;
}

/** ¿Es domingo? (0 = domingo en getDay). */
export function isSunday(iso: string): boolean {
  return parseISODate(iso).getDay() === 0;
}

/**
 * Determina si un día concreto es laborable, considerando la excepción.
 * - "trabajado" siempre cuenta como laborable (override de domingo/feriado).
 * - "feriado" / "libre" nunca son laborables.
 * - Sin excepción: laborable si no es domingo.
 */
export function isWorkday(iso: string, ex?: ExceptionKind): boolean {
  if (ex === "trabajado") return true;
  if (ex === "feriado" || ex === "libre") return false;
  return !isSunday(iso);
}

/** Estado visual de un día para la vista de calendario. */
export function dayStatus(iso: string, ex?: ExceptionKind): DayStatus {
  if (ex === "trabajado") return "trabajo";
  if (ex === "feriado") return "feriado";
  if (ex === "libre") return "libre";
  if (isSunday(iso)) return "domingo";
  return "trabajo";
}

/**
 * Cuenta los días trabajados en un rango [startISO, endISO] inclusive,
 * aplicando el calendario base + las excepciones.
 */
export function countWorkdays(
  startISO: string,
  endISO: string,
  exMap: Map<string, ExceptionKind>,
): number {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  let count = 0;
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const iso = toISODate(cursor);
    if (isWorkday(iso, exMap.get(iso))) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Genera la matriz del mes (semanas) para la vista de calendario.
 *  Cada celda es null (relleno) o un objeto con la fecha ISO. Semana inicia lunes. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1, 12);
  // getDay: 0=domingo..6=sábado -> queremos lunes primero
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISODate(new Date(year, month, d, 12)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
