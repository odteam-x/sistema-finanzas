"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultAccountId } from "@/lib/accounts";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { parseISODate, toISODate, todayISO } from "@/lib/format";
import type { DebtFrequency, ReceivableKind } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function revalidateAll() {
  revalidatePath("/cobros");
  revalidatePath("/dashboard");
  revalidatePath("/balance");
  revalidatePath("/movimientos");
}

/** Registra que te PAGARON: el dinero entra a una cuenta (depósito en el
 *  ledger). Al contrario de un gasto, esto NO va a `expenses` — cobrar no
 *  es gastar; es dinero que entra. */
async function recordCollection(
  supabase: SupabaseClient,
  userId: string,
  refId: string,
  amount: number,
  label: string,
  accountId?: string,
): Promise<void> {
  const account_id = accountId || (await getOrCreateDefaultAccountId(supabase, userId));
  if (!account_id) return;
  await supabase.from("savings_movements").insert({
    account_id,
    user_id: userId,
    kind: "deposito",
    amount,
    date: todayISO(),
    note: `Cobro recibido: ${label}`,
    source: "receivable_collected",
    source_ref_id: refId,
  });
}

/** Revierte el depósito al desmarcar un cobro. */
async function removeCollection(supabase: SupabaseClient, refId: string): Promise<void> {
  await supabase
    .from("savings_movements")
    .delete()
    .eq("source", "receivable_collected")
    .eq("source_ref_id", refId);
}

function stepDate(iso: string, freq: DebtFrequency, times: number): string {
  const d = parseISODate(iso);
  if (freq === "mensual") d.setMonth(d.getMonth() + times);
  else d.setDate(d.getDate() + times * (freq === "semanal" ? 7 : 15));
  return toISODate(d);
}

export async function addReceivable(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const rawKind = String(formData.get("kind") ?? "cobro");
  const kind: ReceivableKind = rawKind === "prestamo" ? "prestamo" : "cobro";
  const name = String(formData.get("name") ?? "").trim();
  const total = parseAmount(formData.get("total_amount"));
  const acquired_date = String(formData.get("acquired_date") ?? "") || todayISO();
  const payment_type = String(formData.get("payment_type") ?? "unico");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!name) return { ok: false, error: "Escribe el nombre de la persona." };
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
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

    const { data: rec, error } = await supabase
      .from("receivables")
      .insert({
        user_id: user.id,
        kind,
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
    if (error || !rec) return { ok: false, error: "No se pudo crear el registro." };

    const rows = Array.from({ length: count }, (_, i) => ({
      receivable_id: rec.id,
      user_id: user.id,
      seq: i + 1,
      due_date: stepDate(firstDue, frequency, i),
      amount: perAmount,
      paid: false,
    }));
    const { error: instErr } = await supabase.from("receivable_installments").insert(rows);
    if (instErr) return { ok: false, error: "No se pudieron crear las cuotas." };
  } else {
    const due_date = String(formData.get("due_date") ?? "") || null;
    const { error } = await supabase.from("receivables").insert({
      user_id: user.id,
      kind,
      name,
      total_amount: total,
      acquired_date,
      payment_type: "unico",
      due_date,
      status: "pendiente",
      note,
    });
    if (error) return { ok: false, error: "No se pudo crear el registro." };
  }

  revalidateAll();
  return { ok: true };
}

/** Un cobro ya saldado es de solo lectura (mismo criterio que R03 en deudas). */
async function assertNotCollected(
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("receivables")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!data) return "No se encontró el registro.";
  if (data.status === "cobrada") {
    return "Esto ya está cobrado por completo. Reábrelo primero si necesitas cambiarlo.";
  }
  return null;
}

export async function updateReceivable(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const total = parseAmount(formData.get("total_amount"));
  const due_date = String(formData.get("due_date") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!id) return { ok: false };
  if (!name) return { ok: false, error: "Escribe el nombre de la persona." };
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  const supabase = await createClient();
  const blocked = await assertNotCollected(supabase, id);
  if (blocked) return { ok: false, error: blocked };

  const { error } = await supabase
    .from("receivables")
    .update({ name, total_amount: total, due_date, note })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateAll();
  return { ok: true };
}

/** Marca una cuota como cobrada: el dinero ENTRA a la cuenta elegida. */
export async function toggleReceivableInstallment(
  installmentId: string,
  receivableId: string,
  paid: boolean,
  accountId?: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("receivable_installments")
    .update({ paid, paid_date: paid ? todayISO() : null })
    .eq("id", installmentId);
  if (error) return { ok: false };

  if (paid) {
    const { data: inst } = await supabase
      .from("receivable_installments")
      .select("amount")
      .eq("id", installmentId)
      .maybeSingle();
    const { data: rec } = await supabase
      .from("receivables")
      .select("name")
      .eq("id", receivableId)
      .maybeSingle();
    if (inst) {
      await recordCollection(
        supabase,
        user.id,
        installmentId,
        Number(inst.amount),
        rec?.name ?? "",
        accountId,
      );
    }
  } else {
    await removeCollection(supabase, installmentId);
  }

  // El estado lo recalcula el trigger de la base (ver migration-v11).
  revalidateAll();
  return { ok: true };
}

/** Marca un cobro de pago único como recibido. */
export async function toggleReceivableCollected(
  id: string,
  paid: boolean,
  accountId?: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("receivables")
    .update({ status: paid ? "cobrada" : "pendiente" })
    .eq("id", id);
  if (error) return { ok: false };

  if (paid) {
    const { data: rec } = await supabase
      .from("receivables")
      .select("name, total_amount")
      .eq("id", id)
      .maybeSingle();
    if (rec) {
      await recordCollection(supabase, user.id, id, Number(rec.total_amount), rec.name, accountId);
    }
  } else {
    await removeCollection(supabase, id);
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteReceivable(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();

  // Mismo criterio que R03 en deudas: eliminar el registro NO deshace el
  // dinero que de verdad entró. Los depósitos ya recibidos se conservan,
  // solo se les quita el vínculo y se re-etiquetan como manuales.
  const { data: rec } = await supabase
    .from("receivables")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  const { data: insts } = await supabase
    .from("receivable_installments")
    .select("id")
    .eq("receivable_id", id);
  const refIds = [id, ...(insts ?? []).map((i) => i.id)];

  await supabase
    .from("savings_movements")
    .update({
      source: "manual",
      source_ref_id: null,
      note: `Cobro de registro eliminado — ${rec?.name ?? "sin nombre"}`,
    })
    .eq("source", "receivable_collected")
    .in("source_ref_id", refIds);

  const { error } = await supabase.from("receivables").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateAll();
  return { ok: true };
}
