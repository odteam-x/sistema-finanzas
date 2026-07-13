// Nombre del usuario, guardado en este dispositivo (localStorage).
// Se usa para personalizar el tono de las respuestas del asistente IA
// (ver lib/ai/gemini.ts) y saludos dentro de la app.

const PROFILE_STORAGE_KEY = "bolsillo-seguro:profile";

export interface UserProfile {
  displayName: string;
}

const DEFAULT_PROFILE: UserProfile = { displayName: "" };

export function readProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { displayName: typeof parsed?.displayName === "string" ? parsed.displayName : "" };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function writeProfile(profile: UserProfile): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage no disponible; se pierde al recargar, sin romper la app.
  }
}
