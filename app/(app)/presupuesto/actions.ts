"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";

function revalidateAll() {
  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
  revalidatePath("/balance");
}

/** El límite mensual es opcional: un campo vacío guarda NULL (sin límite). */
function parseOptionalAmount(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = parseAmount(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function addCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseAmount(formData.get("amount_per_workday"));
  const monthly_limit = parseOptionalAmount(formData.get("monthly_limit"));
  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("budget_categories").insert({
    user_id: user.id,
    name,
    amount_per_workday: amount,
    monthly_limit,
  });
  if (error) return { ok: false, error: "No se pudo agregar." };
  revalidateAll();
  return { ok: true };
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseAmount(formData.get("amount_per_workday"));
  const monthly_limit = parseOptionalAmount(formData.get("monthly_limit"));
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("budget_categories")
    .update({ name, amount_per_workday: amount, monthly_limit })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateAll();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("budget_categories").delete().eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}

export async function addExpense(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const amount = parseAmount(formData.get("amount"));
  const date = String(formData.get("date") ?? "");
  const tag_id = String(formData.get("tag_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const account_id = String(formData.get("account_id") ?? "") || null;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  if (!date) return { ok: false, error: "Selecciona la fecha." };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount,
    date,
    tag_id,
    note,
    account_id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el gasto." };

  // Si se asoció una cuenta, refleja el gasto como retiro (misma fuente de
  // verdad que Cuentas).
  if (account_id) {
    await supabase.from("savings_movements").insert({
      account_id,
      user_id: user.id,
      kind: "retiro",
      amount,
      date,
      note: note ? `Gasto: ${note}` : "Gasto",
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}

/** Fija manualmente los días trabajados de una quincena puntual, en vez de
 *  usar el conteo automático del calendario. */
export async function setPeriodOverride(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const period_key = String(formData.get("period_key") ?? "");
  const workdays = Number(formData.get("workdays"));
  if (!period_key) return { ok: false };
  if (!Number.isFinite(workdays) || workdays < 0) {
    return { ok: false, error: "Ingresa un número de días válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("budget_period_overrides")
    .upsert({ user_id: user.id, period_key, workdays }, { onConflict: "user_id,period_key" });
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidateAll();
  return { ok: true };
}

export async function clearPeriodOverride(periodKey: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("budget_period_overrides")
    .delete()
    .eq("user_id", user.id)
    .eq("period_key", periodKey);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}
