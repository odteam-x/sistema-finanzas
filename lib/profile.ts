// Nombre del usuario, guardado en este dispositivo (localStorage).
// Se usa para el saludo del Inicio (components/ui/HomeHero.tsx) y el
// formulario de Configuración.

import { storageKey } from "./storageKey";

const clave = () => storageKey("profile");

export interface UserProfile {
  displayName: string;
}

const DEFAULT_PROFILE: UserProfile = { displayName: "" };

export function readProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(clave());
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { displayName: typeof parsed?.displayName === "string" ? parsed.displayName : "" };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function writeProfile(profile: UserProfile): void {
  try {
    window.localStorage.setItem(clave(), JSON.stringify(profile));
  } catch {
    // localStorage no disponible; se pierde al recargar, sin romper la app.
  }
}
