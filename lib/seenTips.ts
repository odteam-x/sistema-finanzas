// Consejos que este dispositivo ya abrió. Mismo patrón que lib/preferences.ts
// —localStorage, no la base— porque es preferencia de presentación, no un dato
// financiero, y perderla al cambiar de teléfono no le hace daño a nadie.

const KEY = "cachin:seen-tips";

/** Referencia estable para el caso "nada leído". useSyncExternalStore compara
 *  snapshots por identidad: devolver un [] nuevo en cada llamada haría que
 *  React re-renderice sin parar. */
const EMPTY: readonly string[] = Object.freeze([]);

// Caché del último valor parseado, por la misma razón: getSnapshot puede
// llamarse varias veces por render y JSON.parse devolvería un array distinto
// cada vez aunque el contenido no haya cambiado.
let lastRaw: string | null = null;
let lastValue: readonly string[] = EMPTY;

export function readSeenTips(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === lastRaw) return lastValue;
    lastRaw = raw;
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    // Guardia real: el contenido de localStorage lo puede haber escrito
    // cualquiera (o una versión vieja de la app), así que se valida en vez de
    // confiar en que sea un array de strings.
    lastValue =
      Array.isArray(parsed) && parsed.every((k) => typeof k === "string")
        ? Object.freeze([...parsed])
        : EMPTY;
    return lastValue;
  } catch {
    return EMPTY;
  }
}

/** Snapshot del servidor: en SSR nunca hay nada leído, así que el HTML sale
 *  con el orden por relevancia pura y React lo reordena tras hidratar, sin
 *  desajuste de hidratación. */
export function serverSeenTips(): readonly string[] {
  return EMPTY;
}

export function markTipSeen(key: string): void {
  try {
    const actual = readSeenTips();
    if (actual.includes(key)) return;
    window.localStorage.setItem(KEY, JSON.stringify([...actual, key]));
  } catch {
    // localStorage no disponible (modo privado, cuota llena): el consejo no
    // se recuerda como leído, pero la pantalla sigue funcionando.
  }
}

/** No-op a propósito, igual que el `subscribeNoop` de HomeHero.tsx.
 *
 *  useSyncExternalStore exige un `subscribe`, pero aquí NO queremos avisar de
 *  los cambios: si marcar un consejo como leído provocara un re-render, la
 *  lista se reordenaría en el mismo instante en que el usuario lo abre y el
 *  que acaba de tocar se le iría al fondo bajo el dedo. El orden nuevo se
 *  aplica en la siguiente visita a la pantalla, que es cuando no molesta. */
export function subscribeSeenTips(): () => void {
  return () => {};
}
