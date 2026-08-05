/** Los cuatro datos de "Tu situación" en el Inicio. */
export type SituationTile = "adeudado" | "proximaDeuda" | "proximoPago" | "ahorrado";

/** Orden por defecto. Es el que tenía la rejilla 2×2 antes de esto, para que
 *  sin ninguna señal activa nada se mueva de donde el usuario ya lo tiene. */
const BASE: SituationTile[] = ["ahorrado", "adeudado", "proximoPago", "proximaDeuda"];

export interface SituationSignals {
  /** Días hasta la deuda más próxima. Negativo = vencida. `null` si no hay. */
  daysToDue: number | null;
  outstandingDebt: number;
  /** Días hasta el próximo cobro. 0 = hoy. */
  daysToPay: number;
  /** Metas + ahorro sin meta asignada. */
  totalSaved: number;
}

/* Cuánto reclama cada dato el primer lugar. Solo puntúa lo ACCIONABLE hoy:
   una deuda que vence en tres semanas no pide nada, una vencida sí.

   "ahorrado" no puntúa nunca. Es el ancla: siempre hay una cifra de ahorro que
   mirar, así que si compitiera ganaría siempre y las demás no subirían jamás
   — el mismo papel que hace "movimientos" en lib/sectionOrder.ts. Además es la
   cifra que menos cambia de un día para otro, o sea la que menos urge. */
const CLAIM: Record<SituationTile, (s: SituationSignals) => number> = {
  proximaDeuda: (s) => {
    if (s.daysToDue === null) return 0;
    if (s.daysToDue < 0) return 5; // vencida: lo más urgente de la pantalla
    if (s.daysToDue <= 3) return 4;
    return 0;
  },
  proximoPago: (s) => (s.daysToPay === 0 ? 3 : s.daysToPay === 1 ? 2 : 0),
  // Deber dinero no es una urgencia por sí solo —es un estado, no un evento—,
  // así que puntúa por debajo de cualquier fecha que sí lo sea.
  adeudado: (s) => (s.outstandingDebt > 0 ? 1 : 0),
  ahorrado: () => 0,
};

/** Ordena los cuatro datos de "Tu situación" por lo que reclama atención hoy.
 *  El primero sube a tamaño grande en el Inicio y el resto se colapsa.
 *
 *  Deliberadamente conservador, igual que orderHomeSections: sin ninguna señal
 *  activa devuelve el orden de siempre, y el dato vuelve a su sitio cuando el
 *  motivo desaparece. Los empates los rompe el orden base, porque `sort` es
 *  estable — eso hace la salida determinista y las pruebas posibles. */
export function orderSituationTiles(s: SituationSignals): SituationTile[] {
  return [...BASE].sort((a, b) => CLAIM[b](s) - CLAIM[a](s));
}

/** Atajo: solo el que gana. */
export function situationHighlight(s: SituationSignals): SituationTile {
  return orderSituationTiles(s)[0];
}
