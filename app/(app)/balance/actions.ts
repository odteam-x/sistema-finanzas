"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultAccountId } from "@/lib/accounts";
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
  revalidatePath("/balance");
  revalidatePath("/ingresos");
  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
  revalidatePath("/metas");
  revalidatePath("/movimientos");
}

export async function addAccount(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = parseAccountType(formData.get("type"));
  const initial = parseAmount(formData.get("initial_amount"));
  const goal_id = String(formData.get("goal_id") ?? "") || null;
  if (!name) return { ok: false, error: "Escribe un nombre para la cuenta." };

  const supabase = await createClient();
  const { data: account, error } = await supabase
    .from("savings_accounts")
    .insert({ user_id: user.id, name, type, goal_id })
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
  const goal_id = String(formData.get("goal_id") ?? "") || null;
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe un nombre." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("savings_accounts")
    .update({ name, type, goal_id })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateAll();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Desde migration-v9, expenses.account_id y salaries.account_id son NOT NULL
  // con FK RESTRICT: la base impide borrar una cuenta que todavía tenga
  // gastos o ingresos colgando. Se reasignan a la cuenta por defecto para no
  // perder ese historial (con CASCADE se borrarían los gastos junto con la
  // cuenta, que no es lo que nadie espera al eliminar una cuenta).
  const fallbackId = await getOrCreateDefaultAccountId(supabase, user.id);
  if (!fallbackId) {
    return { ok: false, error: "No se pudo determinar una cuenta de respaldo." };
  }
  if (fallbackId === id) {
    return {
      ok: false,
      error: "Es tu única cuenta o la cuenta por defecto. Crea otra antes de eliminarla.",
    };
  }

  await Promise.all([
    supabase.from("expenses").update({ account_id: fallbackId }).eq("account_id", id),
    supabase.from("salaries").update({ account_id: fallbackId }).eq("account_id", id),
    // Transferencias que APUNTABAN a esta cuenta como destino: también
    // bloquean el borrado (FK RESTRICT en to_account_id).
    supabase.from("savings_movements").update({ to_account_id: fallbackId }).eq("to_account_id", id),
  ]);

  // Los savings_movements de la propia cuenta sí caen por CASCADE — es
  // correcto: son el saldo de esa cuenta, no historial reutilizable.
  const { error } = await supabase.from("savings_accounts").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la cuenta." };
  revalidateAll();
  return { ok: true };
}

/** Transferencia entre dos cuentas propias: UNA fila la representa entera
 *  (sale de account_id, entra a to_account_id). No cuenta como ingreso ni
 *  como gasto — el dinero no entró ni salió del sistema, solo cambió de
 *  bolsillo. Ver lib/balances.ts y la vista v_account_balances. */
export async function addTransfer(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const from_account_id = String(formData.get("from_account_id") ?? "");
  const to_account_id = String(formData.get("to_account_id") ?? "");
  const amount = parseAmount(formData.get("amount"));
  const date = String(formData.get("date") ?? "") || todayISO();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!from_account_id || !to_account_id) {
    return { ok: false, error: "Elige la cuenta de origen y la de destino." };
  }
  if (from_account_id === to_account_id) {
    return { ok: false, error: "Elige dos cuentas distintas." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("savings_movements").insert({
    account_id: from_account_id,
    to_account_id,
    user_id: user.id,
    kind: "transferencia",
    amount,
    date,
    note,
    source: "manual",
  });
  if (error) return { ok: false, error: "No se pudo registrar la transferencia." };
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
