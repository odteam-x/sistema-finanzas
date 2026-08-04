// Consejos generales de finanzas personales (contenido estático, educativo).
// No constituye asesoría de inversión personalizada.

export interface Tip {
  /** Identificador estable. Es lo que se guarda en el registro de "ya leído",
   *  así que NO puede cambiar aunque se reescriba el título o el cuerpo: si
   *  cambiara, el consejo volvería a contar como nuevo para quien ya lo leyó. */
  key: string;
  title: string;
  body: string;
}

export const TIPS: Tip[] = [
  {
    key: "50-30-20",
    title: "Regla 50/30/20",
    body: "Destina ~50% del ingreso a necesidades, 30% a gustos y 20% al ahorro y pago de deudas. Ajústala a tu realidad.",
  },
  {
    key: "fondo-emergencia",
    title: "Fondo de emergencia",
    body: "Apunta a ahorrar el equivalente a 3–6 meses de gastos fijos. Te protege ante imprevistos sin endeudarte.",
  },
  {
    key: "pagate-primero",
    title: "Págate a ti primero",
    body: "Aparta el ahorro apenas cobras, no lo que sobra al final. Trátalo como un gasto fijo más.",
  },
  {
    key: "deuda-cara",
    title: "Ataca primero la deuda cara",
    body: "Prioriza pagar las deudas con mayor interés. Reducen tu dinero disponible mes a mes.",
  },
  {
    key: "registrar-gastos",
    title: "Registra cada gasto",
    body: "Anotar lo que gastas cada día te da control real. Lo que se mide, se mejora.",
  },
  {
    key: "presupuesto-quincena",
    title: "Presupuesto por quincena",
    body: "Planifica en función de tus días trabajados y pagos quincenales. Evita quedarte corto a fin de mes.",
  },
  {
    key: "compras-impulsivas",
    title: "Evita compras impulsivas",
    body: "Ante una compra grande, espera 24 horas. Si aún la necesitas, cabe mejor en tu presupuesto.",
  },
  {
    key: "metas-concretas",
    title: "Metas concretas",
    body: "Define metas con monto y fecha. Un objetivo claro es más fácil de alcanzar que “ahorrar más”.",
  },
];

/** Señales de la situación del usuario que cambian qué consejo conviene leer
 *  primero. Todas salen de getFinanceSummary(); se pasan sueltas para que
 *  orderTips() sea pura y se pueda probar sin montar un resumen entero. */
export interface TipSituation {
  hasDebt: boolean;
  hasGoals: boolean;
  hasSavings: boolean;
  hasBudget: boolean;
  /** Ya registró algún gasto en la quincena. */
  logsExpenses: boolean;
  /** Gastó más de lo presupuestado en la quincena. */
  overBudget: boolean;
}

/* Cuánto sube cada consejo según lo que le falta al usuario. El número no es
   una nota de calidad del consejo: es cuánto le urge a ESTA persona hoy.

   Se puntúa lo que FALTA, no lo que ya hace bien. A quien no tiene ninguna
   meta le sirve "Metas concretas"; a quien ya tiene tres, no — y ese hueco es
   justo lo que el orden fijo de antes no podía notar. */
const RELEVANCE: Record<string, (s: TipSituation) => number> = {
  "deuda-cara": (s) => (s.hasDebt ? 4 : 0),
  "registrar-gastos": (s) => (s.logsExpenses ? 0 : 4),
  "presupuesto-quincena": (s) => (s.hasBudget ? 0 : 3),
  "fondo-emergencia": (s) => (s.hasSavings ? 0 : 3),
  "metas-concretas": (s) => (s.hasGoals ? 0 : 3),
  "compras-impulsivas": (s) => (s.overBudget ? 3 : 0),
  "pagate-primero": (s) => (s.hasSavings ? 0 : 2),
  // Marco general: nunca urge, pero es la mejor puerta de entrada para quien
  // todavía no ha configurado nada.
  "50-30-20": (s) => (s.hasBudget ? 0 : 1),
};

/** Ordena los consejos por lo que le hace falta a esta persona, dejando al
 *  final los que ya leyó.
 *
 *  Lo leído pesa MÁS que la relevancia (de ahí el -100): un consejo que ya
 *  leíste deja de ser útil por muy bien que encaje con tu situación, y si no
 *  bajara del todo se quedaría clavado arriba para siempre. Aun así no se
 *  esconde ni se borra — baja, que es reversible y no le quita a nadie la
 *  posibilidad de releerlo.
 *
 *  Empates: el orden del array manda, porque `sort` es estable. Eso hace la
 *  salida determinista y las pruebas posibles. */
export function orderTips(situation: TipSituation, seen: readonly string[] = []): Tip[] {
  const score = (t: Tip) =>
    (RELEVANCE[t.key]?.(situation) ?? 0) - (seen.includes(t.key) ? 100 : 0);
  return [...TIPS].sort((a, b) => score(b) - score(a));
}
