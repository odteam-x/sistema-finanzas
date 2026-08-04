import { formatDOP } from "./format";

/** Datos que necesita la línea contextual del Inicio. Todos salen de
 *  getFinanceSummary(); se pasan sueltos para que la función sea pura y se
 *  pueda probar sin montar un resumen entero. */
export interface GreetingSituation {
  /** Días hasta el próximo cobro. 0 = hoy. */
  daysToPay: number;
  /** Presupuesto de gastos de la quincena. 0 si no lo ha configurado. */
  estQuincena: number;
  /** Gastado real en la quincena. */
  realQuincena: number;
  /** Días que le quedan a la quincena, hoy incluido. */
  daysLeftInQuincena: number;
}

/** Segunda línea del saludo del Inicio: lo que le pasa HOY a esta persona,
 *  o `null` cuando no hay nada que valga la pena decir.
 *
 *  La regla que manda es no repetir. El bloque de Alertas vive dos dedos más
 *  abajo en la misma pantalla y ya dice "Vas sobre el presupuesto", "Deuda
 *  vencida" y "Vencimiento cercano" — repetirlos aquí no informa, solo hace
 *  ruido y le quita fuerza a la alerta de verdad. Por eso el sobregiro
 *  devuelve `null` en vez de una frase: ese caso ya está cubierto.
 *
 *  Lo que sí aporta es el cruce que no está en ninguna parte de la pantalla:
 *  cuánto presupuesto queda CONTRA cuántos días faltan. "Gastos de la
 *  quincena" muestra gastado y presupuestado, pero deja la resta y el reparto
 *  por días de tarea al lector, que es justo la cuenta que importa en una app
 *  que presupuesta por quincena. */
export function greetingContext(s: GreetingSituation): string | null {
  if (s.daysToPay === 0) return "Hoy es día de cobro";

  const restante = s.estQuincena - s.realQuincena;
  if (s.estQuincena > 0 && restante > 0 && s.daysLeftInQuincena > 0) {
    const dinero = formatDOP(restante, false);
    return s.daysLeftInQuincena === 1
      ? `Te quedan ${dinero} para el último día de la quincena`
      : `Te quedan ${dinero} para los ${s.daysLeftInQuincena} días que restan`;
  }

  // Sin presupuesto configurado no hay reparto que contar, pero el cobro
  // inminente sigue siendo lo que ordena la quincena. Se corta en 3 días:
  // más allá deja de ser "lo que te pasa hoy" y pasa a ser calendario.
  if (s.daysToPay === 1) return "Mañana es día de cobro";
  if (s.daysToPay > 1 && s.daysToPay <= 3) return `Faltan ${s.daysToPay} días para tu cobro`;

  return null;
}
