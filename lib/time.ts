// "Ahora" anclado a la zona horaria de República Dominicana
// (America/Santo_Domingo = GMT-4 fijo, sin horario de verano).
//
// Por qué existe: los Server Components corren en el servidor (UTC en
// Vercel). Calcular "hoy" con `new Date()` sobre la TZ ambiente hace que,
// de noche en RD, el servidor ya esté en el día siguiente en UTC y "hoy"
// se corra un día (bug de off-by-one en Deudas/Calendario/Metas). Aquí se
// deriva la fecha/hora SIEMPRE en la TZ de RD, sin importar dónde corra.
//
// REGLA: las fechas SIN hora (vencimientos, fecha de gasto, límite de meta)
// se manejan como string "YYYY-MM-DD". Nunca uses `new Date("YYYY-MM-DD")`
// para parsearlas: se interpreta como medianoche UTC y se corre un día en
// GMT-4. Usa parseISODate() de lib/format.ts (construye al mediodía local).

const DR_TIME_ZONE = "America/Santo_Domingo";

let _partsFmt: Intl.DateTimeFormat | null = null;
function partsFmt(): Intl.DateTimeFormat {
  // en-CA da año-mes-día con ceros a la izquierda; forzamos la TZ de RD y
  // hora de 24h para leer los componentes de forma estable.
  return (_partsFmt ??= new Intl.DateTimeFormat("en-CA", {
    timeZone: DR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }));
}

function drParts(date: Date = new Date()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of partsFmt().formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  return out;
}

/** Fecha de HOY en RD como "YYYY-MM-DD", correcta sin importar la TZ del runtime. */
export function todayISODR(date: Date = new Date()): string {
  const p = drParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora actual en RD (0-23), para saludos y lógica de "momento del día". */
export function hourInDR(date: Date = new Date()): number {
  const h = Number(drParts(date).hour);
  // en-CA/24h puede devolver "24" a la medianoche en algunos runtimes.
  return h === 24 ? 0 : h;
}
