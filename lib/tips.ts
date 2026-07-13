// Consejos generales de finanzas personales (contenido estático, educativo).
// No constituye asesoría de inversión personalizada.

export interface Tip {
  title: string;
  body: string;
}

export const TIPS: Tip[] = [
  {
    title: "Regla 50/30/20",
    body: "Destina ~50% del ingreso a necesidades, 30% a gustos y 20% al ahorro y pago de deudas. Ajústala a tu realidad.",
  },
  {
    title: "Fondo de emergencia",
    body: "Apunta a ahorrar el equivalente a 3–6 meses de gastos fijos. Te protege ante imprevistos sin endeudarte.",
  },
  {
    title: "Págate a ti primero",
    body: "Aparta el ahorro apenas cobras, no lo que sobra al final. Trátalo como un gasto fijo más.",
  },
  {
    title: "Ataca primero la deuda cara",
    body: "Prioriza pagar las deudas con mayor interés. Reducen tu dinero disponible mes a mes.",
  },
  {
    title: "Registra cada gasto",
    body: "Anotar lo que gastas cada día te da control real. Lo que se mide, se mejora.",
  },
  {
    title: "Presupuesto por quincena",
    body: "Planifica en función de tus días trabajados y pagos quincenales. Evita quedarte corto a fin de mes.",
  },
  {
    title: "Evita compras impulsivas",
    body: "Ante una compra grande, espera 24 horas. Si aún la necesitas, cabe mejor en tu presupuesto.",
  },
  {
    title: "Metas concretas",
    body: "Define metas con monto y fecha. Un objetivo claro es más fácil de alcanzar que “ahorrar más”.",
  },
];
