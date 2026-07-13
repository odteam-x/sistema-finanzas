"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";

function revalidateAll() {
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function addGoal(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const target = parseAmount(formData.get("target_amount"));
  const current = parseAmount(formData.get("current_amount"));
  const deadline = String(formData.get("deadline") ?? "") || null;

  if (!name) return { ok: false, error: "Escribe un nombre para la meta." };
  if (!Number.isFinite(target) || target <= 0) {
    return { ok: false, error: "Ingresa un monto objetivo válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name,
    target_amount: target,
    current_amount: Number.isFinite(current) && current > 0 ? current : 0,
    deadline,
  });
  if (error) return { ok: false, error: "No se pudo crear la meta." };
  revalidateAll();
  return { ok: true };
}

export async function updateGoal(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const target = parseAmount(formData.get("target_amount"));
  const deadline = String(formData.get("deadline") ?? "") || null;
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (!Number.isFinite(target) || target <= 0) {
    return { ok: false, error: "Ingresa un monto objetivo válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ name, target_amount: target, deadline })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateAll();
  return { ok: true };
}

export async function addProgress(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const amount = parseAmount(formData.get("amount"));
  if (!id) return { ok: false };
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "Ingresa un monto." };
  }
  const supabase = await createClient();
  const { data: goal } = await supabase
    .from("goals")
    .select("current_amount")
    .eq("id", id)
    .maybeSingle();
  if (!goal) return { ok: false, error: "Meta no encontrada." };
  const next = Math.max(0, Number(goal.current_amount) + amount);
  const { error } = await supabase
    .from("goals")
    .update({ current_amount: next })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar el ahorro." };
  revalidateAll();
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}
