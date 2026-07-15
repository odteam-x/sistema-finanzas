// Utilidades de formato (moneda RD$, fechas es-DO) y manejo de fechas
// tipo "YYYY-MM-DD" sin problemas de zona horaria.
//
// Los formateadores Intl se crean de forma perezosa (no al importar el
// módulo) y con respaldo a "en-US" si el runtime no soporta el locale
// "es-DO", para que un entorno con ICU reducido nunca tumbe la página.

import { todayISODR } from "./time";

function safeIntl<T>(build: (locale: string) => T): T {
  try {
    return build("es-DO");
  } catch {
    return build("en-US");
  }
}

// Solo se usa Intl para el agrupamiento de miles (independiente del locale
// de moneda). El prefijo "RD$" se antepone a mano: antes se usaba
// style:"currency" con currency:"DOP", pero en un runtime sin el locale
// es-DO (ICU reducido, típico en el servidor) Intl imprime el código ISO
// "DOP" en vez del símbolo "RD$" — de ahí la mezcla "RD$…"/"DOP…" según la
// pantalla corriera en cliente o servidor. Con prefijo fijo, siempre "RD$".
let _groupFmt: Intl.NumberFormat | null = null;
function groupFmt(): Intl.NumberFormat {
  return (_groupFmt ??= safeIntl(
    (locale) =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
  ));
}

let _groupFmtNoDecimals: Intl.NumberFormat | null = null;
function groupFmtNoDecimals(): Intl.NumberFormat {
  return (_groupFmtNoDecimals ??= safeIntl(
    (locale) =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
  ));
}

/** Formato RD$ (ej. "RD$1,250.00", "-RD$4,400"). Prefijo fijo — nunca "DOP". */
export function formatDOP(amount: number, decimals = true): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const fmt = decimals ? groupFmt() : groupFmtNoDecimals();
  const sign = n < 0 ? "-" : "";
  return `${sign}RD$${fmt.format(Math.abs(n))}`;
}

/** Convierte "YYYY-MM-DD" a un Date local al mediodía (evita saltos por TZ). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Convierte un Date a "YYYY-MM-DD" en hora local. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Hoy como "YYYY-MM-DD", anclado a la TZ de RD (no a la del servidor).
 *  Ver lib/time.ts — corrige el off-by-one cuando el runtime corre en UTC. */
export function todayISO(): string {
  return todayISODR();
}

let _dateFmtLong: Intl.DateTimeFormat | null = null;
function dateFmtLong(): Intl.DateTimeFormat {
  return (_dateFmtLong ??= safeIntl(
    (locale) =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
  ));
}

let _dateFmtShort: Intl.DateTimeFormat | null = null;
function dateFmtShort(): Intl.DateTimeFormat {
  return (_dateFmtShort ??= safeIntl(
    (locale) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
  ));
}

let _monthFmt: Intl.DateTimeFormat | null = null;
function monthFmt(): Intl.DateTimeFormat {
  return (_monthFmt ??= safeIntl(
    (locale) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
  ));
}

let _weekdayFmt: Intl.DateTimeFormat | null = null;
function weekdayFmt(): Intl.DateTimeFormat {
  return (_weekdayFmt ??= safeIntl(
    (locale) => new Intl.DateTimeFormat(locale, { weekday: "long" }),
  ));
}

/** "12 de julio de 2026" */
export function formatDateLong(iso: string): string {
  return dateFmtLong().format(parseISODate(iso));
}

/** "12 jul" */
export function formatDateShort(iso: string): string {
  return dateFmtShort().format(parseISODate(iso));
}

/** "julio de 2026" (a partir de año/mes 0-index) */
export function formatMonth(year: number, month: number): string {
  return monthFmt().format(new Date(year, month, 1, 12));
}

let _monthShortFmt: Intl.DateTimeFormat | null = null;
function monthShortFmt(): Intl.DateTimeFormat {
  return (_monthShortFmt ??= safeIntl(
    (locale) => new Intl.DateTimeFormat(locale, { month: "short" }),
  ));
}

/** "jul" (a partir de año/mes 0-index) */
export function formatMonthShort(year: number, month: number): string {
  return monthShortFmt().format(new Date(year, month, 1, 12));
}

export function formatWeekday(iso: string): string {
  return weekdayFmt().format(parseISODate(iso));
}

/** Diferencia en días entre dos fechas ISO (b - a). */
export function daysBetween(aISO: string, bISO: string): number {
  const a = parseISODate(aISO).getTime();
  const b = parseISODate(bISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Suma días a una fecha ISO y devuelve ISO. */
export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Porcentaje acotado 0-100. */
export function clampPct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}
