// Feriados dominicanos por defecto (semilla editable por el usuario).
// El usuario puede añadir o quitar feriados desde el módulo de Calendario;
// esta lista solo se usa para pre-cargar sugerencias.

import { toISODate } from "./format";

export interface HolidaySeed {
  date: string; // YYYY-MM-DD
  label: string;
  transferable: boolean; // trasladable por Ley 139-97 (nominal, el usuario ajusta)
}

/** Cálculo de Pascua (algoritmo de Meeus/Butcher) → Date local. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Feriados nacionales dominicanos para un año dado. */
export function dominicanHolidays(year: number): HolidaySeed[] {
  const easter = easterSunday(year);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  return [
    { date: `${year}-01-01`, label: "Año Nuevo", transferable: false },
    { date: `${year}-01-06`, label: "Día de Reyes", transferable: true },
    {
      date: `${year}-01-21`,
      label: "Nuestra Señora de la Altagracia",
      transferable: false,
    },
    { date: `${year}-01-26`, label: "Día de Duarte", transferable: true },
    {
      date: `${year}-02-27`,
      label: "Día de la Independencia",
      transferable: false,
    },
    { date: toISODate(goodFriday), label: "Viernes Santo", transferable: false },
    { date: `${year}-05-01`, label: "Día del Trabajo", transferable: true },
    {
      date: toISODate(corpusChristi),
      label: "Corpus Christi",
      transferable: false,
    },
    {
      date: `${year}-08-16`,
      label: "Día de la Restauración",
      transferable: true,
    },
    {
      date: `${year}-09-24`,
      label: "Nuestra Señora de las Mercedes",
      transferable: false,
    },
    {
      date: `${year}-11-06`,
      label: "Día de la Constitución",
      transferable: true,
    },
    { date: `${year}-12-25`, label: "Día de Navidad", transferable: false },
  ];
}
