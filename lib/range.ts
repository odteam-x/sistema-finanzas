import { todayISO, toISODate } from "./format";

export type RangePreset = "todo" | "mes" | "3m";

export const RANGE_LABEL: Record<RangePreset, string> = {
  todo: "Todo",
  mes: "Este mes",
  "3m": "Últimos 3 meses",
};

/** Límites de fecha para los presets de filtro rápido (Movimientos,
 *  Ingresos, Gastos) — mismo estilo que la ventana de comparación de
 *  Reportes, pero con los presets reducidos a los tres casos de uso reales
 *  de una lista (no una comparación mes a mes). */
export function rangeBounds(preset: RangePreset): { from?: string; to?: string } {
  if (preset === "todo") return {};
  const today = todayISO();
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  const monthsBack = preset === "mes" ? 0 : 2;
  const from = toISODate(new Date(y, m - 1 - monthsBack, 1, 12));
  return { from, to: today };
}

export function parseRangePreset(value: string | undefined): RangePreset {
  return value === "mes" || value === "3m" ? value : "todo";
}
