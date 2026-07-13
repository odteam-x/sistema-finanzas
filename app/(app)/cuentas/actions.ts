"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { todayISO } from "@/lib/format";
import type { AccountType, MovementKind } from "@/lib/types";

const ACCOUNT_TYPE_VALUES: AccountType[] = [
  "ahorro",
  "banco",
  "efectivo",
  "tarjeta_credito",
  "tarjeta_debito",
];

function parseAccountType(value: FormDataEntryValue | null): AccountType {
  const v = String(value ?? "");
  return (ACCOUNT_TYPE_VALUES as string[]).includes(v) ? (v as AccountType) : "ahorro";
}

function revalidateAll() {
  revalidatePath("/cuentas");
  revalidatePath("/ingresos");
  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
}

export async function addAccount(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = parseAccountType(formData.get("type"));
  const initial = parseAmount(formData.get("initial_amount"));
  if (!name) return { ok: false, error: "Escribe un nombre para la cuenta." };

  const supabase = await createClient();
  const { data: account, error } = await supabase
    .from("savings_accounts")
    .insert({ user_id: user.id, name, type })
    .select("id")
    .single();
  if (error || !account) return { ok: false, error: "No se pudo crear la cuenta." };

  if (Number.isFinite(initial) && initial > 0) {
    await supabase.from("savings_movements").insert({
      account_id: account.id,
      user_id: user.id,
      kind: "deposito",
      amount: initial,
      date: todayISO(),
      note: "Saldo inicial",
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = parseAccountType(formData.get("type"));
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe un nombre." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("savings_accounts")
    .update({ name, type })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateAll();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("savings_accounts").delete().eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}

export async function addMovement(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const account_id = String(formData.get("account_id") ?? "");
  const kind = String(formData.get("kind") ?? "deposito") as MovementKind;
  const amount = parseAmount(formData.get("amount"));
  const date = String(formData.get("date") ?? "") || todayISO();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!account_id) return { ok: false, error: "Cuenta no válida." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("savings_movements").insert({
    account_id,
    user_id: user.id,
    kind: kind === "retiro" ? "retiro" : "deposito",
    amount,
    date,
    note,
  });
  if (error) return { ok: false, error: "No se pudo registrar el movimiento." };
  revalidateAll();
  return { ok: true };
}

export async function deleteMovement(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("savings_movements").delete().eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}
