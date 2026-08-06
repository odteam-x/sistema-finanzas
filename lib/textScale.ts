// Escala de texto elegida por el usuario. Multiplica el font-size del elemento
// raíz, así que escala TODA la tipografía de una vez — y con ella los objetivos
// táctiles (min-h-11 = 2.75rem) y el ancho del contenedor (max-w-md = 28rem),
// porque el sistema ya estaba en rem. Que el contenedor crezca es deliberado:
// con texto grande, más ancho disponible es justo lo que evita que las cifras
// se partan en dos líneas.
//
// No se usa el zoom del navegador ni un <meta viewport> escalable: eso amplía
// también el layout y la PWA deja de comportarse como una app.
//
// Se guarda en DOS sitios y cada uno tiene su razón:
//   · localStorage — lo aplica el script de arranque ANTES del primer pintado.
//     Es el único que puede evitar el parpadeo; la base llega tarde para eso.
//   · user_profile.text_scale (migration-v32) — es accesibilidad, así que viaja
//     con la cuenta. Al entrar en un dispositivo nuevo se siembra desde ahí.

/** Los cuatro valores son cerrados a propósito: cada uno se comprobó contra las
 *  14 pantallas. Un deslizador continuo dejaría entrar tamaños sin verificar. */
export const TEXT_SCALES = [0.9, 1, 1.15, 1.3] as const;

export type TextScale = (typeof TEXT_SCALES)[number];

export const DEFAULT_TEXT_SCALE: TextScale = 1;

export const TEXT_SCALE_STORAGE_KEY = "bolsillo-seguro:text-scale";

export const TEXT_SCALE_LABEL: Record<TextScale, string> = {
  0.9: "Pequeño",
  1: "Normal",
  1.15: "Grande",
  1.3: "Muy grande",
};

export function isTextScale(v: unknown): v is TextScale {
  return typeof v === "number" && (TEXT_SCALES as readonly number[]).includes(v);
}

/** Lee la escala guardada en este dispositivo; el default si no hay nada válido. */
export function readTextScale(): TextScale {
  if (typeof window === "undefined") return DEFAULT_TEXT_SCALE;
  try {
    const raw = window.localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
    if (raw === null) return DEFAULT_TEXT_SCALE;
    const n = Number(raw);
    return isTextScale(n) ? n : DEFAULT_TEXT_SCALE;
  } catch {
    return DEFAULT_TEXT_SCALE;
  }
}

/** ¿Este dispositivo tiene ya una escala elegida? Distingue "el usuario eligió
 *  Normal" de "nunca eligió nada", que es lo que decide si se siembra desde la
 *  cuenta o se respeta lo local. */
export function hasStoredTextScale(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TEXT_SCALE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Aplica la escala al documento (la consume `html { font-size }`). */
export function applyTextScale(scale: TextScale): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--text-scale", String(scale));
}

/** Guarda en este dispositivo y aplica de inmediato. La copia en la cuenta la
 *  escribe aparte la Server Action: esto es síncrono y no puede fallar por red. */
export function writeTextScale(scale: TextScale): void {
  applyTextScale(scale);
  try {
    window.localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(scale));
  } catch {
    // localStorage no disponible (modo privado, cuota llena) — se aplica igual
    // para la sesión actual, solo no persiste.
  }
}

/**
 * Script inline para el <head>, hermano del que aplica el tema: fija la escala
 * antes del primer pintado. Sin él, la página pinta a tamaño normal y salta al
 * hidratar — y un salto de tamaño de letra es mucho más violento que un
 * cambio de color, porque mueve TODO el layout.
 */
export const TEXT_SCALE_INIT_SCRIPT = `(function(){try{
  var raw=localStorage.getItem(${JSON.stringify(TEXT_SCALE_STORAGE_KEY)});
  var n=raw===null?1:Number(raw);
  if(n!==0.9&&n!==1&&n!==1.15&&n!==1.3)n=1;
  document.documentElement.style.setProperty("--text-scale",String(n));
}catch(e){}})();`;
