"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { softDeleteRows, type UndoableResult } from "@/lib/softDelete";
import { normalizeKeyword } from "@/lib/categorize";

function revalidateAll() {
  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
  revalidatePath("/ingresos");
  revalidatePath("/presupuesto");
  revalidatePath("/suscripciones");
  revalidatePath("/reportes");
}

/** El límite mensual es opcional: un campo vacío guarda NULL (sin límite). */
function parseOptionalAmount(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = parseAmount(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function saveDisplayName(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profile")
    .upsert({ user_id: user.id, display_name });
  if (error) return { ok: false, error: "No se pudo guardar el nombre." };
  revalidateAll();
  return { ok: true };
}

export async function addTag(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "primary") || "primary";
  const monthly_limit = parseOptionalAmount(formData.get("monthly_limit"));
  if (!name) return { ok: false, error: "Escribe un nombre." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("tags")
    .insert({ user_id: user.id, name, color, monthly_limit });
  if (error) return { ok: false, error: "No se pudo agregar la etiqueta." };
  revalidateAll();
  return { ok: true };
}

export async function updateTag(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "primary") || "primary";
  const monthly_limit = parseOptionalAmount(formData.get("monthly_limit"));
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe un nombre." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("tags")
    .update({ name, color, monthly_limit })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateAll();
  return { ok: true };
}

export async function deleteTag(id: string): Promise<UndoableResult> {
  await requireUser();
  // R15: borrado suave, para poder deshacerlo desde el aviso.
  const res = await softDeleteRows("tags", [id]);
  const error = res.ok ? null : true;
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateAll();
  return { ok: true, undo: res.undo };
}

/** Tasa editable por el usuario — RD no tiene un feed automático confiable
 *  (ver lib/currency.ts). Upsert por (user_id, currency): una fila por
 *  moneda, no una columna fija por moneda. */
export async function setExchangeRate(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const currency = String(formData.get("currency") ?? "");
  if (currency !== "USD" && currency !== "EUR") {
    return { ok: false, error: "Moneda no válida." };
  }
  const rate = parseAmount(formData.get("rate_to_dop"));
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, error: "Ingresa una tasa válida." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("exchange_rates")
    .upsert(
      { user_id: user.id, currency, rate_to_dop: rate, updated_at: new Date().toISOString() },
      { onConflict: "user_id,currency" },
    );
  if (error) return { ok: false, error: "No se pudo guardar la tasa." };
  revalidateAll();
  revalidatePath("/balance");
  return { ok: true };
}

/** Regla de auto-categorización: "si la nota contiene X -> categoría Y",
 *  aplicada al registrar un gasto sin categoría explícita (ver addExpense en
 *  presupuesto/actions.ts). `keyword` se normaliza aquí (una sola vez, al
 *  guardar) para que la comparación en cada gasto sea una simple búsqueda de
 *  substring. */
export async function addCategorizationRule(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const keyword = normalizeKeyword(String(formData.get("keyword") ?? ""));
  const tag_id = String(formData.get("tag_id") ?? "");
  if (!keyword) return { ok: false, error: "Escribe una palabra clave." };
  if (!tag_id) return { ok: false, error: "Elige una categoría." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("categorization_rules")
    .insert({ user_id: user.id, keyword, tag_id });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Ya existe una regla con esa palabra clave." : "No se pudo agregar la regla.",
    };
  }
  revalidateAll();
  return { ok: true };
}

export async function deleteCategorizationRule(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("categorization_rules").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la regla." };
  revalidateAll();
  return { ok: true };
}
