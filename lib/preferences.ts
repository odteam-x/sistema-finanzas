// Preferencias de UI guardadas en este dispositivo (localStorage), mismo
// patrón que lib/theme.ts y lib/profile.ts — no van a la base porque son
// de presentación, no datos financieros.

const PRIMARY_ACCOUNT_KEY = "cachin:primary-account";

/** Cuenta que se muestra en "Balance actual" del Inicio (R12). */
export function readPrimaryAccount(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PRIMARY_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

export function writePrimaryAccount(accountId: string): void {
  try {
    window.localStorage.setItem(PRIMARY_ACCOUNT_KEY, accountId);
  } catch {
    // localStorage no disponible; se pierde al recargar, sin romper la app.
  }
}
