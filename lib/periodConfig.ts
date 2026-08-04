import "server-only";
import { getSalarySettings } from "./data";
import { periodDaysFor, type PeriodDays } from "./periods";

/** Los días que abren período para el usuario en sesión.
 *
 *  Existe para que las páginas no tengan que cargar salary_settings solo para
 *  esto ni repetir la regla de qué frecuencias anclan período (que vive en
 *  periodDaysFor, y es la única que decide). Quien ya tiene los ajustes en la
 *  mano —getFinanceSummary, por ejemplo— llama a periodDaysFor directamente y
 *  se ahorra la consulta. */
export async function getPeriodDays(): Promise<PeriodDays> {
  const settings = await getSalarySettings();
  return periodDaysFor(settings);
}
