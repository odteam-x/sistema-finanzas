"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";

function revalidateAll() {
  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
}

export async function addCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseAmount(formData.get("amount_per_workday"));
  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("budget_categories").insert({
    user_id: user.id,
    name,
    amount_per_workday: amount,
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
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("budget_categories")
    .update({ name, amount_per_workday: amount })
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
  const category_id = String(formData.get("category_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  if (!date) return { ok: false, error: "Selecciona la fecha." };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount,
    date,
    category_id,
    note,
  });
  if (error) return { ok: false, error: "No se pudo registrar el gasto." };
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
