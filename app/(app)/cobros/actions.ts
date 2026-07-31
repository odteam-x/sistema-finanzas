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
): Promise<boolean> {
  const account_id = accountId || (await getOrCreateDefaultAccountId(supabase, userId));
  if (!account_id) return false;
  const { error } = await supabase.from("savings_movements").insert({
    account_id,
    user_id: userId,
    kind: "deposito",
    amount,
    date: todayISO(),
    note: `Cobro recibido: ${label}`,
    source: "receivable_collected",
    source_ref_id: refId,
  });
  // Mismo bug que encontró check:coherence en Deudas (recordDebtPayment):
  // el resultado del insert no se revisaba, así que un rechazo silencioso
  // (RLS, constraint) dejaba la cuota marcada "cobrada" sin que el dinero
  // hubiera entrado. Acá el insert es uno solo, pero el riesgo es el mismo.
  if (error) {
    console.error("[recordCollection] insert falló:", error.message);
    return false;
  }
  return true;
}

/** Revierte el depósito al desmarcar un cobro. */
async function removeCollection(supabase: SupabaseClient, refId: string): Promise<void> {
  await supabase
    .from("savings_movements")
    .delete()
    .eq("source", "receivable_collected")
    .eq("source_ref_id", refId);
}

/** Marca cobrada una cuota (o, si installmentId es null, un cobro de pago
 *  único) y registra el depósito — todo en UNA transacción vía
 *  collect_receivable() (migration-v19). Mismo problema que resolvió
 *  pay_debt()/unpay_debt() en Deudas (migration-v18): antes eran 2
 *  escrituras sueltas, con el mismo riesgo de quedar "cobrado" sin que el
 *  dinero hubiera entrado de verdad si la segunda fallaba a medias.
 *
 *  Si la función todavía no existe (migración sin correr), cae al camino
 *  anterior — mismo resultado, sin la atomicidad. */
async function collectReceivable(
  supabase: SupabaseClient,
  userId: string,
  receivableId: string,
  installmentId: string | null,
  amount: number,
  label: string,
  accountId?: string,
): Promise<boolean> {
  const account_id = accountId || (await getOrCreateDefaultAccountId(supabase, userId));
  if (!account_id) return false;

  const { error } = await supabase.rpc("collect_receivable", {
    p_receivable_id: receivableId,
    p_installment_id: installmentId,
    p_amount: amount,
    p_account_id: account_id,
    p_label: label,
  });
  if (!error) return true;

  if (installmentId) {
    await supabase
      .from("receivable_installments")
      .update({ paid: true, paid_date: todayISO() })
      .eq("id", installmentId);
  } else {
    await supabase.from("receivables").update({ status: "cobrada" }).eq("id", receivableId);
  }
  const wrote = await recordCollection(supabase, userId, installmentId ?? receivableId, amount, label, account_id);
  if (!wrote) {
    // Este camino de respaldo no es atómico de verdad — si el insert falla
    // acá, se revierte la marca de "cobrada" a mano en vez de dejarla
    // mentir sobre que el dinero entró (mismo bug real que encontró
    // check:coherence del lado de Deudas).
    if (installmentId) {
      await supabase.from("receivable_installments").update({ paid: false, paid_date: null }).eq("id", installmentId);
    } else {
      await supabase.from("receivables").update({ status: "pendiente" }).eq("id", receivableId);
    }
    return false;
  }
  return true;
}

/** Reverso de collectReceivable(): vía uncollect_receivable(), mismo
 *  criterio que unpayDebt() en Deudas — el camino de vuelta queda igual de
 *  atómico que el de ida. */
async function uncollectReceivable(
  supabase: SupabaseClient,
  receivableId: string,
  installmentId: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("uncollect_receivable", {
    p_receivable_id: receivableId,
    p_installment_id: installmentId,
  });
  if (!error) return;

  if (installmentId) {
    await supabase
      .from("receivable_installments")
      .update({ paid: false, paid_date: null })
      .eq("id", installmentId);
  } else {
    await supabase.from("receivables").update({ status: "pendiente" }).eq("id", receivableId);
  }
  await removeCollection(supabase, installmentId ?? receivableId);
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
  const chosenAccount = String(formData.get("account_id") ?? "") || null;

  // ¿El dinero de este préstamo pasó por tus manos? Cuando kind='prestamo'
  // (le prestas a alguien), ese dinero SALE de una cuenta real hoy mismo —
  // simétrico a creditDisbursement() en deudas/actions.ts (cuando TE
  // prestan, el dinero entra). Antes esto no existía: el balance de la
  // cuenta no bajaba hasta cobrar, como si el préstamo no le hubiera
  // costado nada al usuario hasta ese momento.
  async function debitDisbursement(receivableId: string, amount: number) {
    if (kind !== "prestamo") return;
    const account_id = chosenAccount ?? (await getOrCreateDefaultAccountId(supabase, user.id));
    if (!account_id) return;
    const { error } = await supabase.from("savings_movements").insert({
      account_id,
      user_id: user.id,
      kind: "retiro",
      amount,
      date: acquired_date,
      note: `Préstamo dado: ${name}`,
      source: "receivable_disbursement",
      source_ref_id: receivableId,
    });
    if (error) console.error("[debitDisbursement] insert falló:", error.message);
  }

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
    await debitDisbursement(rec.id, total);
  } else {
    const due_date = String(formData.get("due_date") ?? "") || null;
    const { data: rec, error } = await supabase
      .from("receivables")
      .insert({
        user_id: user.id,
        kind,
        name,
        total_amount: total,
        acquired_date,
        payment_type: "unico",
        due_date,
        status: "pendiente",
        note,
      })
      .select("id")
      .single();
    if (error || !rec) return { ok: false, error: "No se pudo crear el registro." };
    await debitDisbursement(rec.id, total);
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

  // Atómico vía collectReceivable()/uncollectReceivable() (migration-v19)
  // — el estado lo recalcula el trigger de la base (ver migration-v11),
  // dentro de la misma transacción cuando la RPC está disponible.
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
    if (!inst) return { ok: false };
    const ok = await collectReceivable(
      supabase,
      user.id,
      receivableId,
      installmentId,
      Number(inst.amount),
      rec?.name ?? "",
      accountId,
    );
    if (!ok) return { ok: false, error: "No se pudo registrar el cobro." };
  } else {
    await uncollectReceivable(supabase, receivableId, installmentId);
  }

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

  if (paid) {
    const { data: rec } = await supabase
      .from("receivables")
      .select("name, total_amount")
      .eq("id", id)
      .maybeSingle();
    if (!rec) return { ok: false };
    const ok = await collectReceivable(supabase, user.id, id, null, Number(rec.total_amount), rec.name, accountId);
    if (!ok) return { ok: false, error: "No se pudo registrar el cobro." };
  } else {
    await uncollectReceivable(supabase, id, null);
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

  await Promise.all([
    supabase
      .from("savings_movements")
      .update({
        source: "manual",
        source_ref_id: null,
        note: `Cobro de registro eliminado — ${rec?.name ?? "sin nombre"}`,
      })
      .eq("source", "receivable_collected")
      .in("source_ref_id", refIds),
    // El dinero que prestaste SÍ salió de verdad (si kind='prestamo') —
    // mismo criterio que arriba: se conserva re-etiquetado, no se borra.
    // Borrarlo le devolvería a tu balance dinero que de verdad diste.
    supabase
      .from("savings_movements")
      .update({
        source: "manual",
        source_ref_id: null,
        note: `Préstamo de registro eliminado — ${rec?.name ?? "sin nombre"}`,
      })
      .eq("source", "receivable_disbursement")
      .eq("source_ref_id", id),
  ]);

  const { error } = await supabase.from("receivables").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateAll();
  return { ok: true };
}
