// Multi-moneda: fuente única de formateo y conversión. DOP sigue usando
// formatDOP() (lib/format.ts) tal cual — esto es solo para USD/EUR y para
// convertir cualquier moneda a su equivalente en RD$.
import type { Currency, ExchangeRate } from "./types";

const SYMBOLS: Record<Currency, string> = { DOP: "RD$", USD: "US$", EUR: "€" };

/** Formatea un monto en su propia moneda — mismo criterio tabular/2
 *  decimales que formatDOP, pero con el símbolo que corresponda. */
export function formatMoneyIn(amount: number, currency: Currency, decimals = true): string {
  const n = decimals ? amount.toFixed(2) : Math.round(amount).toString();
  const [intPart, decPart] = n.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${SYMBOLS[currency]}${withThousands}${decPart ? `.${decPart}` : ""}`;
}

/** Mapa currency -> tasa a RD$, para no repetir el .find() en cada sitio
 *  que convierte. DOP siempre es 1 (no está en la tabla exchange_rates). */
export function ratesMap(rates: ExchangeRate[]): Record<Currency, number> {
  const out: Record<Currency, number> = { DOP: 1, USD: 0, EUR: 0 };
  for (const r of rates) out[r.currency] = Number(r.rate_to_dop);
  return out;
}

/** Convierte un monto de su moneda a RD$. Si es una moneda distinta de DOP
 *  y no hay tasa configurada (rate = 0), devuelve 0 en vez de un NaN o un
 *  monto engañoso — mejor mostrar "sin tasa" que un total incorrecto. */
export function toDOP(amount: number, currency: Currency, rates: Record<Currency, number>): number {
  if (currency === "DOP") return amount;
  const rate = rates[currency];
  return rate > 0 ? amount * rate : 0;
}

/** "hace 3 días" / "hoy" — para mostrar cuán vieja es la tasa configurada,
 *  sin pretender que es un feed en vivo. */
export function daysAgoLabel(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}
