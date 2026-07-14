"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";

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

export async function deleteTag(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}
