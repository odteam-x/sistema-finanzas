// Personalización de tema: color de marca + modo claro/oscuro.
// Se guarda en localStorage — es por dispositivo/navegador, no por cuenta.

export type ThemeColor = "green" | "blue" | "purple" | "red" | "orange";
export type ThemeMode = "light" | "dark";

export interface ThemePref {
  color: ThemeColor;
  mode: ThemeMode;
}

export const THEME_STORAGE_KEY = "bolsillo-seguro:theme";

export const DEFAULT_THEME: ThemePref = { color: "green", mode: "light" };

export const THEME_COLORS: { value: ThemeColor; label: string; swatch: string }[] = [
  { value: "green", label: "Verde", swatch: "#2E7D5B" },
  { value: "blue", label: "Azul", swatch: "#2563AF" },
  { value: "purple", label: "Púrpura", swatch: "#6D4AA6" },
  { value: "red", label: "Rojo", swatch: "#B23A3A" },
  { value: "orange", label: "Naranja", swatch: "#C1631A" },
];

function isThemeColor(v: unknown): v is ThemeColor {
  return typeof v === "string" && THEME_COLORS.some((c) => c.value === v);
}

/** Lee la preferencia guardada; devuelve el default si no hay nada válido. */
export function readTheme(): ThemePref {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);
    const color = isThemeColor(parsed?.color) ? parsed.color : DEFAULT_THEME.color;
    const mode: ThemeMode = parsed?.mode === "dark" ? "dark" : "light";
    return { color, mode };
  } catch {
    return DEFAULT_THEME;
  }
}

/** Aplica la preferencia al documento (atributos que consume globals.css). */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", pref.color);
  document.documentElement.setAttribute("data-mode", pref.mode);
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
 */
export const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var t=raw?JSON.parse(raw):null;var color=(t&&t.color)||"green";var mode=(t&&t.mode==="dark")?"dark":"light";var d=document.documentElement;d.setAttribute("data-theme",color);d.setAttribute("data-mode",mode);}catch(e){}})();`;
