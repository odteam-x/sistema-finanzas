// Metas cuya pantalla de logro ya se mostró en este dispositivo. Mismo patrón
// que lib/seenTips.ts —localStorage, no la base— porque es estado de
// presentación: si cambias de teléfono y vuelves a ver una celebración, no
// pasa nada; si se guardara en la base habría que migrarlo y limpiarlo.

import { storageKey } from "./storageKey";

const clave = () => storageKey("celebrated-goals");

/** Referencia estable para "ninguna". useSyncExternalStore compara snapshots
 *  por identidad y devolver un [] nuevo cada vez haría re-render sin parar. */
const EMPTY: readonly string[] = Object.freeze([]);

let lastRaw: string | null = null;
let lastValue: readonly string[] = EMPTY;

export function readCelebratedGoals(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(clave());
    if (raw === lastRaw) return lastValue;
    lastRaw = raw;
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    lastValue =
      Array.isArray(parsed) && parsed.every((k) => typeof k === "string")
        ? Object.freeze([...parsed])
        : EMPTY;
    return lastValue;
  } catch {
    return EMPTY;
  }
}

/** En SSR nunca hay nada celebrado, así que el HTML del servidor sale sin
 *  overlay y el cliente decide tras hidratar — sin desajuste de hidratación. */
export function serverCelebratedGoals(): readonly string[] {
  return EMPTY;
}

export function markGoalCelebrated(id: string): void {
  try {
    const actual = readCelebratedGoals();
    if (actual.includes(id)) return;
    window.localStorage.setItem(clave(), JSON.stringify([...actual, id]));
  } catch {
    // localStorage no disponible: la celebración volverá a salir la próxima
    // vez. Molesta menos que romper la pantalla.
  }
}

/** No-op deliberado, igual que subscribeSeenTips. Marcar una meta como
 *  celebrada NO debe re-renderizar: el overlay se cierra por su propio estado,
 *  y avisar del cambio lo haría desaparecer a mitad de la animación. */
export function subscribeCelebratedGoals(): () => void {
  return () => {};
}
