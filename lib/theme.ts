// Personalización de tema: modo claro/oscuro/automático. Una sola marca
// (teal) desde la Fase 3 del rediseño — ya no hay selector de color.
// Se guarda en localStorage — es por dispositivo/navegador, no por cuenta.

export type ThemeMode = "light" | "dark" | "auto";

export interface ThemePref {
  mode: ThemeMode;
}

export const THEME_STORAGE_KEY = "bolsillo-seguro:theme";

export const DEFAULT_THEME: ThemePref = { mode: "auto" };

function isThemeMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "auto";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resuelve "auto" al modo real según el sistema; light/dark quedan igual. */
export function resolveMode(mode: ThemeMode): "light" | "dark" {
  return mode === "auto" ? (systemPrefersDark() ? "dark" : "light") : mode;
}

/** Lee la preferencia guardada; devuelve el default (auto) si no hay nada válido. */
export function readTheme(): ThemePref {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);
    const mode = isThemeMode(parsed?.mode) ? parsed.mode : DEFAULT_THEME.mode;
    return { mode };
  } catch {
    return DEFAULT_THEME;
  }
}

/** Aplica la preferencia al documento (atributo que consume globals.css).
 *  Siempre escribe un data-mode concreto ("light"/"dark"), nunca "auto" —
 *  así ningún selector CSS necesita saber sobre el modo automático. */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-mode", resolveMode(pref.mode));
}

/** Guarda y aplica de inmediato. */
export function writeTheme(pref: ThemePref): void {
  applyTheme(pref);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // localStorage no disponible (modo privado, cuota llena, etc.) — se
    // aplica igual para la sesión actual, solo no persiste.
  }
}

/**
 * Script inline a inyectar en <head> para aplicar el tema ANTES del primer
 * pintado (evita el "flash" de tema por defecto al cargar la página).
 * Resuelve "auto" contra prefers-color-scheme del sistema en el momento.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
  var raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  var t=raw?JSON.parse(raw):null;
  var mode=(t&&(t.mode==="dark"||t.mode==="light"||t.mode==="auto"))?t.mode:"auto";
  var resolved=mode==="auto"?((window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"):mode;
  document.documentElement.setAttribute("data-mode",resolved);
}catch(e){}})();`;
