// Qué te queda de un cobro después de lo que ya está comprometido.
//
// La pregunta que responde: "cobro el 20, ¿con cuánto me quedo de verdad?".
// El Inicio muestra compromisos próximos, pero nunca los resta del sueldo —
// esa cuenta la tenía que hacer el usuario de cabeza cada quincena.

export type PayoutItemKind = "debt" | "subscription";

export interface PayoutItem {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  kind: PayoutItemKind;
  /** Vencía antes de que arrancara este período y sigue sin pagarse. Se
   *  incluye igual —el dinero se debe— pero la UI lo marca. */
  overdue: boolean;
}

export interface PayoutTotals {
  comprometido: number;
  neto: number;
  /** El neto repartido entre los días que faltan para el próximo cobro.
   *  `null` si no hay días que repartir (cobras hoy). */
  porDia: number | null;
}

/** Suma lo comprometido y lo resta del cobro.
 *
 *  Se recibe la lista de EXCLUIDOS y no la de incluidos a propósito: así, un
 *  compromiso que aparezca después —una deuda nueva, una suscripción recién
 *  dada de alta— cuenta desde el primer momento en vez de quedarse fuera por
 *  no estar en una lista que se guardó antes de que existiera. Olvidarse de
 *  restar algo hace daño; restar de más solo asusta.
 *
 *  El neto PUEDE ser negativo, y no se recorta a cero: si debes más de lo que
 *  cobras eso es justo lo que hay que ver. */
export function payoutTotals(
  gross: number,
  items: readonly PayoutItem[],
  excludedIds: readonly string[],
  daysUntilNextPay: number,
): PayoutTotals {
  const excluidos = new Set(excludedIds);
  const comprometido = items
    .filter((i) => !excluidos.has(i.id))
    .reduce((s, i) => s + i.amount, 0);
  const neto = gross - comprometido;
  return {
    comprometido,
    neto,
    porDia: daysUntilNextPay > 0 ? neto / daysUntilNextPay : null,
  };
}

/** Los compromisos que caen entre hoy y el próximo cobro, más los que ya
 *  estaban vencidos. Ordenados por fecha, los vencidos primero.
 *
 *  El corte es el DÍA DEL PRÓXIMO COBRO, no una ventana de N días: lo que
 *  vence después ya lo cubre el cobro siguiente, no este. */
export function itemsDueBefore(
  items: readonly PayoutItem[],
  todayISO: string,
  nextPayISO: string,
): PayoutItem[] {
  return items
    .filter((i) => i.date < nextPayISO || i.date < todayISO)
    .map((i) => ({ ...i, overdue: i.date < todayISO }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Deudas que vencen DESPUÉS del próximo cobro.
 *
 *  Este cobro no tiene por qué cubrirlas —ya las cubre el siguiente—, pero
 *  poder adelantarlas es una decisión real: si te sobra, quizá prefieras
 *  quitártelas de encima. Por eso van en un bloque aparte y SIN contar por
 *  defecto: sumarlas de entrada haría que el neto pareciera peor de lo que es.
 *
 *  Solo deudas: una suscripción que vence después se va a cobrar igual en su
 *  fecha, así que "adelantarla" no significa nada. */
export function debtsDueAfter(
  items: readonly PayoutItem[],
  nextPayISO: string,
): PayoutItem[] {
  return items
    .filter((i) => i.kind === "debt" && i.date >= nextPayISO)
    .map((i) => ({ ...i, overdue: false }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
