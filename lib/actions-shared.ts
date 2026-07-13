// Tipo de retorno común para las Server Actions de mutación.
export type ActionResult = { ok: boolean; error?: string };

/** Parsea un monto escrito por el usuario ("1,250.50" o "1250.5") a número. */
export function parseAmount(raw: FormDataEntryValue | null): number {
  if (raw == null) return NaN;
  const cleaned = String(raw).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
