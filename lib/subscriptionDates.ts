// Fechas de cobro de una suscripción. Módulo puro a propósito: lo usan tanto
// el catch-up del servidor (lib/subscriptions.ts) como la acción de
// pausar/reanudar, y así la parte delicada —no cobrar retroactivo al
// reanudar— se puede probar sin base de datos.
import { parseISODate, toISODate } from "./format";
import type { SubscriptionFrequency } from "./types";

/** La siguiente fecha de cobro tras `iso`, un período más adelante. */
export function stepChargeDate(iso: string, freq: SubscriptionFrequency): string {
  const d = parseISODate(iso);
  if (freq === "mensual") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return toISODate(d);
}

/** La primera fecha de cobro POSTERIOR a hoy, avanzando de período en
 *  período desde `iso`.
 *
 *  Existe por lo que pasa al REANUDAR una suscripción pausada:
 *  runSubscriptionCatchUp recorre `while (cursor <= today)` generando un
 *  gasto por cada período vencido, así que reactivar una mensual que llevaba
 *  un año pausada dispararía doce gastos y doce retiros de golpe — cobros que
 *  nunca ocurrieron, porque justamente estuvo pausada. Al reanudar se
 *  adelanta la fecha hasta el futuro y el catch-up no encuentra nada atrasado
 *  que generar.
 *
 *  El guard corta en 1000 vueltas: una fecha corrupta muy antigua no debe
 *  colgar la petición. */
export function nextFutureChargeDate(
  iso: string,
  freq: SubscriptionFrequency,
  todayISO: string,
): string {
  let next = iso;
  let guard = 0;
  while (next <= todayISO && guard < 1000) {
    next = stepChargeDate(next, freq);
    guard++;
  }
  return next;
}
