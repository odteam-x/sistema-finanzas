/** Las secciones del Inicio que pueden cambiar de sitio.
 *
 *  "Alertas" y "Tu situación" NO están aquí a propósito: van pegadas al hero
 *  y son las dos primeras lecturas de la pantalla siempre. Moverlas cambiaría
 *  dónde miras al abrir la app, que es lo único que no debe moverse. */
export type HomeSection = "compromisos" | "movimientos" | "gastos" | "ahorros";

/** Orden por defecto. Es el que tenía la pantalla antes de esto, para que sin
 *  ninguna señal activa nada se mueva de donde el usuario ya lo tiene. */
const BASE: HomeSection[] = ["compromisos", "movimientos", "gastos", "ahorros"];

export interface SectionSituation {
  /** Gastado sobre presupuestado, en porcentaje. `null` si no hay presupuesto
   *  configurado: entonces la sección de gastos no tiene nada que reclamar. */
  budgetPct: number | null;
  /** Días hasta el compromiso más próximo. Negativo = vencido. `null` si no
   *  hay ninguno pendiente. */
  daysToNextCommitment: number | null;
  /** Progreso de las metas en porcentaje. `null` si no hay metas. */
  goalsPct: number | null;
}

/* Cuánto reclama cada sección el primer lugar. Solo puntúa lo que pasa AHORA
   y tiene algo que hacer: un presupuesto al 40% a mitad de quincena no pide
   atención, uno al 95% sí.

   "movimientos" no puntúa nunca: es el ancla. Siempre hay movimientos que
   mirar, así que si compitiera ganaría siempre y las demás no subirían nunca. */
const CLAIM: Record<HomeSection, (s: SectionSituation) => number> = {
  compromisos: (s) => {
    if (s.daysToNextCommitment === null) return 0;
    if (s.daysToNextCommitment < 0) return 5; // vencido: lo más urgente
    if (s.daysToNextCommitment <= 3) return 4;
    return 0;
  },
  gastos: (s) => {
    if (s.budgetPct === null) return 0;
    if (s.budgetPct > 100) return 4; // ya te pasaste
    if (s.budgetPct >= 80) return 3; // queda poco margen
    return 0;
  },
  ahorros: (s) => {
    if (s.goalsPct === null) return 0;
    if (s.goalsPct >= 100) return 3; // lo lograste, que se vea
    if (s.goalsPct >= 80) return 2; // casi
    return 0;
  },
  movimientos: () => 0,
};

/** Ordena las secciones movibles del Inicio por lo que reclama atención hoy.
 *
 *  Deliberadamente conservador: sin ninguna señal activa devuelve el orden de
 *  siempre. Una pantalla que se recoloca en cada visita rompe la memoria
 *  muscular y hace que buscar algo cueste más, no menos — así que las
 *  secciones solo se mueven cuando hay un motivo concreto, y vuelven a su
 *  sitio cuando el motivo desaparece.
 *
 *  Los empates los rompe el orden base, porque `sort` es estable. */
export function orderHomeSections(s: SectionSituation): HomeSection[] {
  return [...BASE].sort((a, b) => CLAIM[b](s) - CLAIM[a](s));
}
