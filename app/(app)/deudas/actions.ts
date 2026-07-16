"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultAccountId } from "@/lib/accounts";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { parseISODate, toISODate, todayISO } from "@/lib/format";
import type { DebtFrequency } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function revalidateAll() {
  revalidatePath("/deudas");
  revalidatePath("/dashboard");
  revalidatePath("/balance");
  revalidatePath("/movimientos");
}

/** Inserta el retiro del ledger por un pago de deuda (source='debt_payment',
 *  source_ref_id = id de la cuota o deuda pagada). */
async function recordDebtPayment(
  supabase: SupabaseClient,
  userId: string,
  refId: string,
  amount: number,
  label: string,
): Promise<void> {
  const account_id = await getOrCreateDefaultAccountId(supabase, userId);
  if (!account_id) return;
  await supabase.from("savings_movements").insert({
    account_id,
    user_id: userId,
    kind: "retiro",
    amount,
    date: todayISO(),
    note: `Pago deuda: ${label}`,
    source: "debt_payment",
    source_ref_id: refId,
  });
}

/** Quita el retiro del ledger asociado a una cuota/deuda (al desmarcar pago). */
async function removeDebtPayment(supabase: SupabaseClient, refId: string): Promise<void> {
  await supabase
    .from("savings_movements")
    .delete()
    .eq("source", "debt_payment")
    .eq("source_ref_id", refId);
}

/** Suma "times" periodos de la frecuencia dada a una fecha ISO. */
function stepDate(iso: string, freq: DebtFrequency, times: number): string {
  const d = parseISODate(iso);
  if (freq === "mensual") d.setMonth(d.getMonth() + times);
  else d.setDate(d.getDate() + times * (freq === "semanal" ? 7 : 15));
  return toISODate(d);
}

async function recomputeStatus(
  supabase: SupabaseClient,
  debtId: string,
): Promise<void> {
  const { data } = await supabase
    .from("debt_installments")
    .select("paid")
    .eq("debt_id", debtId);
  if (!data || data.length === 0) return;
  const paid = data.filter((d) => d.paid).length;
  const status =
    paid === 0 ? "pendiente" : paid === data.length ? "pagada" : "parcial";
  await supabase.from("debts").update({ status }).eq("id", debtId);
}

export async function addDebt(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const total = parseAmount(formData.get("total_amount"));
  const acquired_date = String(formData.get("acquired_date") ?? "") || todayISO();
  const payment_type = String(formData.get("payment_type") ?? "unico");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!name) return { ok: false, error: "Escribe el acreedor o nombre de la deuda." };
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "Ingresa un monto total válido." };
  }

  const supabase = await createClient();

  if (payment_type === "cuotas") {
    const count = Number(formData.get("installments_count"));
    const frequency = String(formData.get("frequency") ?? "mensual") as DebtFrequency;
    const firstDue = String(formData.get("first_due_date") ?? "");
    const rawPerAmount = parseAmount(formData.get("installment_amount"));
    if (!(count >= 1)) return { ok: false, error: "Número de cuotas inválido." };
    if (!firstDue) return { ok: false, error: "Indica la fecha de la primera cuota." };
    const perAmount =
      Number.isFinite(rawPerAmount) && rawPerAmount > 0
        ? rawPerAmount
        : Math.round((total / count) * 100) / 100;

    const { data: debt, error: debtErr } = await supabase
      .from("debts")
      .insert({
        user_id: user.id,
        name,
        total_amount: total,
        acquired_date,
        payment_type: "cuotas",
        installments_count: count,
        installment_amount: perAmount,
        frequency,
        status: "pendiente",
        note,
      })
      .select("id")
      .single();
    if (debtErr || !debt) return { ok: false, error: "No se pudo crear la deuda." };

    const rows = Array.from({ length: count }, (_, i) => ({
      debt_id: debt.id,
      user_id: user.id,
      seq: i + 1,
      due_date: stepDate(firstDue, frequency, i),
      amount: perAmount,
      paid: false,
    }));
    const { error: instErr } = await supabase
      .from("debt_installments")
      .insert(rows);
    if (instErr) return { ok: false, error: "No se pudieron crear las cuotas." };
  } else {
    const due_date = String(formData.get("due_date") ?? "") || null;
    const { error } = await supabase.from("debts").insert({
      user_id: user.id,
      name,
      total_amount: total,
      acquired_date,
      payment_type: "unico",
      due_date,
      status: "pendiente",
      note,
    });
    if (error) return { ok: false, error: "No se pudo crear la deuda." };
  }

  revalidateAll();
  return { ok: true };
}

/** Edita una deuda existente: monto total (súmale o réstale) y, si es de
 *  pago único, su fecha de vencimiento (aplázala). */
export async function updateDebt(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const total = parseAmount(formData.get("total_amount"));
  const due_date = String(formData.get("due_date") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe el acreedor o nombre de la deuda." };
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "Ingresa un monto total válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("debts")
    .update({ name, total_amount: total, due_date, note })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar la deuda." };
  revalidateAll();
  return { ok: true };
}

/** Edita una cuota: monto y fecha (para aplazarla) — solo si no está pagada. */
export async function updateInstallment(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const amount = parseAmount(formData.get("amount"));
  const due_date = String(formData.get("due_date") ?? "");
  if (!id) return { ok: false };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  if (!due_date) return { ok: false, error: "Selecciona la fecha." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("debt_installments")
    .update({ amount, due_date })
    .eq("id", id)
    .eq("paid", false);
  if (error) return { ok: false, error: "No se pudo actualizar la cuota." };
  revalidateAll();
  return { ok: true };
}

export async function toggleInstallment(
  installmentId: string,
  debtId: string,
  paid: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("debt_installments")
    .update({ paid, paid_date: paid ? todayISO() : null })
    .eq("id", installmentId);
  if (error) return { ok: false };

  // Pagar una cuota mueve dinero: sale de la cuenta (ledger). Desmarcar lo revierte.
  if (paid) {
    const { data: inst } = await supabase
      .from("debt_installments")
      .select("amount")
      .eq("id", installmentId)
      .maybeSingle();
    const { data: debt } = await supabase
      .from("debts")
      .select("name")
      .eq("id", debtId)
      .maybeSingle();
    if (inst) {
      await recordDebtPayment(supabase, user.id, installmentId, Number(inst.amount), debt?.name ?? "");
    }
  } else {
    await removeDebtPayment(supabase, installmentId);
  }

  await recomputeStatus(supabase, debtId);
  revalidateAll();
  return { ok: true };
}

export async function toggleDebtPaid(
  id: string,
  paid: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("debts")
    .update({ status: paid ? "pagada" : "pendiente" })
    .eq("id", id);
  if (error) return { ok: false };

  if (paid) {
    const { data: debt } = await supabase
      .from("debts")
      .select("name, total_amount")
      .eq("id", id)
      .maybeSingle();
    if (debt) {
      await recordDebtPayment(supabase, user.id, id, Number(debt.total_amount), debt.name);
    }
  } else {
    await removeDebtPayment(supabase, id);
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteDebt(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  // Limpia los movimientos de pago del ledger (de la deuda única y de sus
  // cuotas) antes de borrar, para no dejar retiros huérfanos.
  const { data: insts } = await supabase
    .from("debt_installments")
    .select("id")
    .eq("debt_id", id);
  const refIds = [id, ...(insts ?? []).map((i) => i.id)];
  await supabase
    .from("savings_movements")
    .delete()
    .eq("source", "debt_payment")
    .in("source_ref_id", refIds);

  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) return { ok: false };
  revalidateAll();
  return { ok: true };
}
