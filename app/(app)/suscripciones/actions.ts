"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import type { SubscriptionFrequency } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/suscripciones");
  revalidatePath("/dashboard");
  revalidatePath("/calendario");
}

function parseFrequency(value: FormDataEntryValue | null): SubscriptionFrequency {
  return String(value ?? "") === "anual" ? "anual" : "mensual";
}

export async function addSubscription(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const frequency = parseFrequency(formData.get("frequency"));
  const next_charge_date = String(formData.get("next_charge_date") ?? "");
  const category_id = String(formData.get("category_id") ?? "") || null;
  const account_id = String(formData.get("account_id") ?? "") || null;

  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  if (!next_charge_date) return { ok: false, error: "Selecciona la próxima fecha de cobro." };

  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    name,
    amount,
    frequency,
    next_charge_date,
    category_id,
    account_id,
  });
  if (error) return { ok: false, error: "No se pudo agregar la suscripción." };

  revalidateAll();
  return { ok: true };
}

export async function updateSubscription(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const frequency = parseFrequency(formData.get("frequency"));
  const next_charge_date = String(formData.get("next_charge_date") ?? "");
  const category_id = String(formData.get("category_id") ?? "") || null;
  const account_id = String(formData.get("account_id") ?? "") || null;

  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  if (!next_charge_date) return { ok: false, error: "Selecciona la próxima fecha de cobro." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ name, amount, frequency, next_charge_date, category_id, account_id })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };

  revalidateAll();
  return { ok: true };
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}

export async function toggleSubscriptionActive(id: string, active: boolean): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ active: !active })
    .eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}
