// Auto-categorización por reglas simples (no ML): "si la nota contiene X ->
// categoría Y". Normalizar (minúsculas, sin acentos) evita que "Colmado" y
// "colmado" o "Súper" y "Super" se traten como palabras distintas.
import type { CategorizationRule } from "./types";

const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeKeyword(raw: string): string {
  return raw.trim().toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");
}

/** Primera regla cuya palabra clave aparece en la nota (ya normalizada) —
 *  null si la nota está vacía o ninguna regla coincide. */
export function matchTagForNote(
  note: string | null | undefined,
  rules: CategorizationRule[],
): string | null {
  if (!note) return null;
  const normalized = normalizeKeyword(note);
  if (!normalized) return null;
  const hit = rules.find((r) => normalized.includes(r.keyword));
  return hit?.tag_id ?? null;
}
