"use server";

import { revalidateEverything } from "@/lib/revalidate";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultAccountId } from "@/lib/accounts";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { todayISO } from "@/lib/format";
import { softDeleteRows, type UndoableResult } from "@/lib/softDelete";


/** R14: vincular una deuda existente a esta meta. El vínculo se crea SIEMPRE
 *  desde la meta (nunca desde la deuda), y a partir de ahí el progreso de la
 *  meta incluye lo que ya hayas abonado de esa deuda. */
export async function linkDebtToGoal(goalId: string, debtId: string): Promise<ActionResult> {
  await requireUser();
  if (!goalId || !debtId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("debts").update({ goal_id: goalId }).eq("id", debtId);
  if (error) return { ok: false, error: "No se pudo vincular la deuda." };
  revalidateEverything();
  return { ok: true };
}

/** Desvincular. El progreso que aportaba esa deuda se descuenta de la meta
 *  (por eso la UI pide confirmación antes) — no se "queda" el avance. */
export async function unlinkDebtFromGoal(debtId: string): Promise<ActionResult> {
  await requireUser();
  if (!debtId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("debts").update({ goal_id: null }).eq("id", debtId);
  if (error) return { ok: false, error: "No se pudo desvincular." };
  revalidateEverything();
  return { ok: true };
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
  revalidateEverything();
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
  revalidateEverything();
  return { ok: true };
}

export async function addProgress(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const amount = parseAmount(formData.get("amount"));
  const chosenAccount = String(formData.get("account_id") ?? "") || null;
  if (!id) return { ok: false };
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "Ingresa un monto." };
  }
  const supabase = await createClient();
  const { data: linkedAccount } = await supabase
    .from("savings_accounts")
    .select("id")
    .eq("goal_id", id)
    .maybeSingle();
  if (linkedAccount) {
    return {
      ok: false,
      error: "Esta meta está vinculada a una cuenta — aporta desde Balance.",
    };
  }
  const { data: goal } = await supabase.from("goals").select("name").eq("id", id).maybeSingle();
  if (!goal) return { ok: false, error: "Meta no encontrada." };

  // R01: aportar a una meta SIN cuenta vinculada mueve dinero real — antes
  // esto solo sumaba goals.current_amount a mano, sin tocar ninguna cuenta,
  // así que el balance de cuentas y el total ahorrado se sumaban como si
  // fueran independientes cuando era el mismo dinero. current_amount ya no
  // se escribe acá — goalProgress() (lib/goals.ts) lo usa como baseline
  // congelado y suma este ledger encima.
  const account_id = chosenAccount ?? (await getOrCreateDefaultAccountId(supabase, user.id));
  if (!account_id) {
    return { ok: false, error: "No se pudo determinar la cuenta. Crea una cuenta primero." };
  }

  const isWithdrawal = amount < 0;
  const { error } = await supabase.from("savings_movements").insert({
    account_id,
    user_id: user.id,
    kind: isWithdrawal ? "deposito" : "retiro",
    amount: Math.abs(amount),
    date: todayISO(),
    note: isWithdrawal ? `Retiro de aporte: ${goal.name}` : `Aporte a meta: ${goal.name}`,
    source: "goal_contribution",
    source_ref_id: id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el aporte." };

  revalidateEverything();
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<UndoableResult> {
  await requireUser();
  // R15: borrado suave, para poder deshacerlo desde el aviso.
  const res = await softDeleteRows("goals", [id]);
  const error = res.ok ? null : true;
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateEverything();
  return { ok: true, undo: res.undo };
}
