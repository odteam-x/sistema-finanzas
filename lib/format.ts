// Utilidades de formato (moneda DOP, fechas es-DO) y manejo de fechas
// tipo "YYYY-MM-DD" sin problemas de zona horaria.

const currencyFmt = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFmtNoDecimals = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formato RD$ (ej. "RD$1,250.00"). */
export function formatDOP(amount: number, decimals = true): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return decimals ? currencyFmt.format(n) : currencyFmtNoDecimals.format(n);
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

/** Hoy como "YYYY-MM-DD" (hora local). */
export function todayISO(): string {
  return toISODate(new Date());
}

const dateFmtLong = new Intl.DateTimeFormat("es-DO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateFmtShort = new Intl.DateTimeFormat("es-DO", {
  day: "numeric",
  month: "short",
});

const monthFmt = new Intl.DateTimeFormat("es-DO", {
  month: "long",
  year: "numeric",
});

const weekdayFmt = new Intl.DateTimeFormat("es-DO", { weekday: "long" });

/** "12 de julio de 2026" */
export function formatDateLong(iso: string): string {
  return dateFmtLong.format(parseISODate(iso));
}

/** "12 jul" */
export function formatDateShort(iso: string): string {
  return dateFmtShort.format(parseISODate(iso));
}

/** "julio de 2026" (a partir de año/mes 0-index) */
export function formatMonth(year: number, month: number): string {
  return monthFmt.format(new Date(year, month, 1, 12));
}

export function formatWeekday(iso: string): string {
  return weekdayFmt.format(parseISODate(iso));
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
