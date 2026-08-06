"use server";

import { revalidateEverything } from "@/lib/revalidate";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { softDeleteRows, type UndoableResult } from "@/lib/softDelete";
import { normalizeKeyword } from "@/lib/categorize";
import { TEXT_SCALES, type TextScale } from "@/lib/textScale";


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
  revalidateEverything();
  return { ok: true };
}

/** Copia la escala de texto en la cuenta. El dispositivo ya la aplicó y la
 *  guardó en localStorage de forma síncrona antes de llamar acá — esto solo la
 *  propaga al resto de dispositivos, así que si falla la red no se deshace
 *  nada de lo que el usuario acaba de ver.
 *
 *  No hay revalidateEverything(): la escala la aplica el cliente sobre el
 *  documento, ninguna pantalla renderizada en servidor depende de ella, y
 *  revalidar la app entera por un cambio de tamaño de letra sería tirar toda
 *  la caché para nada. */
export async function saveTextScale(scale: number): Promise<ActionResult> {
  const user = await requireUser();
  if (!TEXT_SCALES.includes(scale as TextScale)) {
    return { ok: false, error: "Escala no válida." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profile")
    .upsert({ user_id: user.id, text_scale: scale });
  if (error) return { ok: false, error: "No se pudo guardar en la cuenta." };
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
  // 23505 = violación del índice único. Desde migration-v29 no puede haber dos
  // etiquetas vivas con el mismo nombre por usuario; sin este caso el usuario
  // leía "No se pudo agregar" y no tenía cómo saber que ya la tiene creada.
  if (error?.code === "23505") {
    return { ok: false, error: "Ya tienes una etiqueta con ese nombre." };
  }
  if (error) return { ok: false, error: "No se pudo agregar la etiqueta." };
  revalidateEverything();
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
  if (error?.code === "23505") {
    return { ok: false, error: "Ya tienes otra etiqueta con ese nombre." };
  }
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateEverything();
  return { ok: true };
}

export async function deleteTag(id: string): Promise<UndoableResult> {
  await requireUser();
  // R15: borrado suave, para poder deshacerlo desde el aviso.
  const res = await softDeleteRows("tags", [id]);
  const error = res.ok ? null : true;
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateEverything();
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
  revalidateEverything();
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
  revalidateEverything();
  return { ok: true };
}

export async function deleteCategorizationRule(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("categorization_rules").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la regla." };
  revalidateEverything();
  return { ok: true };
}
