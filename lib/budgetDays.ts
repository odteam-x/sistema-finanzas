// Fuente ÚNICA de "cuántos días cuentan para el presupuesto de esta
// quincena". La decisión estaba escrita igual en tres archivos
// (lib/summary.ts, presupuesto/page.tsx, presupuesto/categorias/page.tsx);
// al agregar el Modo B (días personalizados) dos de los tres se habrían
// quedado con el conteo viejo.
import { countWorkdays } from "./calendar";
import type { BudgetPeriodOverride, ExceptionKind } from "./types";
import type { Period } from "./periods";

export interface BudgetBasis {
  /** Días que cuentan para multiplicar el gasto diario. */
  days: number;
  mode: "trabajados" | "personalizado";
  /** true si el usuario fijó el número a mano en Modo A. */
  manualCount: boolean;
  customDays: string[];
}

/** Resuelve los días del período según el modo configurado.
 *  - Modo B (personalizado): manda la cantidad de fechas elegidas.
 *  - Modo A con override manual: manda el número que escribió el usuario.
 *  - Modo A sin override: el conteo automático del calendario laboral. */
export function resolveBudgetBasis(
  period: Period,
  overrides: BudgetPeriodOverride[],
  exMap: Map<string, ExceptionKind>,
): BudgetBasis {
  const override = overrides.find((o) => o.period_key === period.key);

  if (override?.mode === "personalizado") {
    // Solo cuentan las fechas que caen dentro de la quincena — si el usuario
    // cambia de período, las de otro mes no deben colarse.
    const inPeriod = (override.custom_days ?? []).filter(
      (d) => d >= period.start && d <= period.end,
    );
    return {
      days: inPeriod.length,
      mode: "personalizado",
      manualCount: false,
      customDays: inPeriod,
    };
  }

  if (override) {
    return {
      days: override.workdays,
      mode: "trabajados",
      manualCount: true,
      customDays: [],
    };
  }

  return {
    days: countWorkdays(period.start, period.end, exMap),
    mode: "trabajados",
    manualCount: false,
    customDays: [],
  };
}
