"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultAccountId } from "@/lib/accounts";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { parseISODate, toISODate, todayISO } from "@/lib/format";
import type { DebtFrequency, DebtKind } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function revalidateAll() {
  revalidatePath("/deudas");
  revalidatePath("/dashboard");
  revalidatePath("/balance");
  revalidatePath("/movimientos");
  revalidatePath("/presupuesto");
}

/** Registra el pago de una deuda: sale de una cuenta (ledger, para el saldo
 *  real de esa cuenta) Y cuenta como gasto real de la quincena (tabla
 *  `expenses`, mismo criterio que cualquier otro gasto) — antes solo se
 *  restaba aparte en el cálculo del disponible, sin aparecer en "Gastos
 *  reales" ni en el presupuesto, dos verdades distintas sobre el mismo
 *  dinero. Ambas filas comparten `source_ref_id` para poder limpiarlas
 *  juntas si se desmarca el pago o se borra la deuda. */
async function recordDebtPayment(
  supabase: SupabaseClient,
  userId: string,
  refId: string,
  amount: number,
  label: string,
  accountId?: string,
): Promise<void> {
  const account_id = accountId || (await getOrCreateDefaultAccountId(supabase, userId));
  if (!account_id) return;
  const date = todayISO();
  const note = `Pago deuda: ${label}`;
  await Promise.all([
    supabase.from("savings_movements").insert({
      account_id,
      user_id: userId,
      kind: "retiro",
      amount,
      date,
      note,
      source: "debt_payment",
      source_ref_id: refId,
    }),
    supabase.from("expenses").insert({
      user_id: userId,
      date,
      amount,
      note,
      account_id,
      source: "debt_payment",
      source_ref_id: refId,
    }),
  ]);
}

/** Quita el retiro del ledger Y el gasto asociados a una cuota/deuda (al
 *  desmarcar pago). */
async function removeDebtPayment(supabase: SupabaseClient, refId: string): Promise<void> {
  await Promise.all([
    supabase.from("savings_movements").delete().eq("source", "debt_payment").eq("source_ref_id", refId),
    supabase.from("expenses").delete().eq("source", "debt_payment").eq("source_ref_id", refId),
  ]);
}

/** Marca pagada una cuota (o, si installmentId es null, una deuda de pago
 *  único) y registra el retiro + el gasto espejo — todo en UNA transacción
 *  vía pay_debt() (migration-v18, la primera función RPC del proyecto).
 *  Antes esto eran 2-3 escrituras sueltas desde TypeScript: si la marca de
 *  "pagada" tenía éxito y el insert del ledger fallaba a medias, quedaba
 *  una cuota marcada pagada sin que el dinero se hubiera movido de verdad.
 *
 *  Si la función todavía no existe (migración sin correr), cae al camino
 *  anterior — mismo resultado, sin la atomicidad — mismo patrón de
 *  degradación que getAccountBalances()/getMovementStats(). */
async function payDebt(
  supabase: SupabaseClient,
  userId: string,
  debtId: string,
  installmentId: string | null,
  amount: number,
  label: string,
  accountId?: string,
): Promise<boolean> {
  const account_id = accountId || (await getOrCreateDefaultAccountId(supabase, userId));
  if (!account_id) return false;

  const { error } = await supabase.rpc("pay_debt", {
    p_debt_id: debtId,
    p_installment_id: installmentId,
    p_amount: amount,
    p_account_id: account_id,
    p_label: label,
  });
  if (!error) return true;

  if (installmentId) {
    await supabase
      .from("debt_installments")
      .update({ paid: true, paid_date: todayISO() })
      .eq("id", installmentId);
  } else {
    await supabase.from("debts").update({ status: "pagada" }).eq("id", debtId);
  }
  await recordDebtPayment(supabase, userId, installmentId ?? debtId, amount, label, account_id);
  return true;
}

/** Reverso de payDebt(): desmarca la cuota/deuda Y quita el retiro + el
 *  gasto, atómico vía unpay_debt() — mismo riesgo de estado a medias que el
 *  camino de ida, así que se cubre igual (no solo "pagar" queda atómico). */
async function unpayDebt(
  supabase: SupabaseClient,
  debtId: string,
  installmentId: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("unpay_debt", {
    p_debt_id: debtId,
    p_installment_id: installmentId,
  });
  if (!error) return;

  if (installmentId) {
    await supabase
      .from("debt_installments")
      .update({ paid: false, paid_date: null })
      .eq("id", installmentId);
  } else {
    await supabase.from("debts").update({ status: "pendiente" }).eq("id", debtId);
  }
  await removeDebtPayment(supabase, installmentId ?? debtId);
}

/** Suma "times" periodos de la frecuencia dada a una fecha ISO. */
function stepDate(iso: string, freq: DebtFrequency, times: number): string {
  const d = parseISODate(iso);
  if (freq === "mensual") d.setMonth(d.getMonth() + times);
  else d.setDate(d.getDate() + times * (freq === "semanal" ? 7 : 15));
  return toISODate(d);
}

// El estado de una deuda en cuotas (pendiente/parcial/pagada) YA NO se
// escribe desde acá: lo recalcula solo un trigger de Postgres cada vez que
// cambia una cuota (ver trg_recompute_debt_status en migration-v10.sql).
// Antes era una columna cacheada que la app tenía que acordarse de
// actualizar tras cada pago — si un pago entraba por otra vía, el estado
// quedaba mintiendo.

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

  // ¿El dinero de esta deuda pasó por tus manos?
  //   'prestamo' → te lo dieron: entra a una cuenta (depósito).
  //   'credito'  → compraste a crédito: el proveedor pagó directo, nunca lo
  //                tocaste, así que no entra nada.
  // Sin esta distinción se contaba doble: gastar dinero prestado restaba una
  // vez al gastarlo y otra al pagar la deuda, cuando en realidad solo te
  // empobreciste al pagarla.
  const rawKind = String(formData.get("kind") ?? "credito");
  const kind: DebtKind = rawKind === "prestamo" ? "prestamo" : "credito";
  const chosenAccount = String(formData.get("account_id") ?? "") || null;

  /** Acredita el dinero recibido a la cuenta elegida (solo en 'prestamo'). */
  async function creditDisbursement(debtId: string, amount: number) {
    if (kind !== "prestamo") return;
    const account_id = chosenAccount ?? (await getOrCreateDefaultAccountId(supabase, user.id));
    if (!account_id) return;
    await supabase.from("savings_movements").insert({
      account_id,
      user_id: user.id,
      kind: "deposito",
      amount,
      date: acquired_date,
      note: `Préstamo recibido: ${name}`,
      source: "debt_disbursement",
      source_ref_id: debtId,
    });
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
        kind,
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
    await creditDisbursement(debt.id, total);
  } else {
    const due_date = String(formData.get("due_date") ?? "") || null;
    const { data: debt, error } = await supabase
      .from("debts")
      .insert({
        user_id: user.id,
        name,
        total_amount: total,
        acquired_date,
        payment_type: "unico",
        due_date,
        status: "pendiente",
        note,
        kind,
      })
      .select("id")
      .single();
    if (error || !debt) return { ok: false, error: "No se pudo crear la deuda." };
    await creditDisbursement(debt.id, total);
  }

  revalidateAll();
  return { ok: true };
}

/** R03: una deuda liquidada es inmutable. Se verifica en el SERVIDOR (no
 *  solo escondiendo el botón en la UI) para que no se pueda editar una
 *  deuda pagada por otra vía. */
async function assertNotSettled(
  supabase: SupabaseClient,
  debtId: string,
): Promise<string | null> {
  const { data: debt } = await supabase
    .from("debts")
    .select("status")
    .eq("id", debtId)
    .maybeSingle();
  if (!debt) return "No se encontró la deuda.";
  if (debt.status === "pagada") {
    return "Esta deuda ya está pagada. Reábrela primero si necesitas cambiarla.";
  }
  return null;
}

/** Edita una deuda existente: monto total (súmale o réstale) y, si es de
 *  pago único, su fecha de vencimiento (aplázala). Bloqueada si ya está
 *  liquidada (R03). */
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
  const blocked = await assertNotSettled(supabase, id);
  if (blocked) return { ok: false, error: blocked };

  const { error } = await supabase
    .from("debts")
    .update({ name, total_amount: total, due_date, note })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar la deuda." };
  revalidateAll();
  return { ok: true };
}

/** R02: le vuelves a deber a la misma persona. Se guarda como historial
 *  (debt_increments) en vez de sobreescribir el monto original, así el
 *  desglose queda visible. NO mueve dinero — deber más no es gastar (R01). */
export async function addDebtIncrement(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const debt_id = String(formData.get("debt_id") ?? "");
  const amount = parseAmount(formData.get("amount"));
  const date = String(formData.get("date") ?? "") || todayISO();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!debt_id) return { ok: false };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }

  const supabase = await createClient();
  const blocked = await assertNotSettled(supabase, debt_id);
  if (blocked) return { ok: false, error: blocked };

  const { data: increment, error } = await supabase
    .from("debt_increments")
    .insert({ debt_id, user_id: user.id, amount, date, note })
    .select("id")
    .single();
  if (error || !increment) return { ok: false, error: "No se pudo agregar el monto." };

  // Si es una deuda tipo préstamo, volver a deberle a la misma persona
  // significa que te dieron MÁS dinero — así que también entra a la cuenta.
  // En una deuda a crédito no entra nada, igual que al crearla.
  const { data: debt } = await supabase
    .from("debts")
    .select("kind, name")
    .eq("id", debt_id)
    .maybeSingle();
  if (debt?.kind === "prestamo") {
    const account_id = await getOrCreateDefaultAccountId(supabase, user.id);
    if (account_id) {
      await supabase.from("savings_movements").insert({
        account_id,
        user_id: user.id,
        kind: "deposito",
        amount,
        date,
        note: `Préstamo recibido: ${debt.name}`,
        source: "debt_disbursement",
        source_ref_id: increment.id,
      });
    }
  }

  revalidateAll();
  return { ok: true };
}

/** Borra un incremento del historial (corrige una equivocación). Tampoco
 *  mueve dinero. */
export async function deleteDebtIncrement(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  // Borrar el aumento es corregir una equivocación: si había acreditado
  // dinero, ese depósito también se va (a diferencia de eliminar la deuda
  // entera, donde el dinero que de verdad se movió se conserva).
  await supabase
    .from("savings_movements")
    .delete()
    .eq("source", "debt_disbursement")
    .eq("source_ref_id", id);
  const { error } = await supabase.from("debt_increments").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateAll();
  return { ok: true };
}

/** R03: reabrir una deuda liquidada revirtiendo su último pago. Acción
 *  explícita y confirmada — es la única forma de volver a editarla. */
export async function reopenDebt(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();

  const { data: debt } = await supabase
    .from("debts")
    .select("payment_type")
    .eq("id", id)
    .maybeSingle();
  if (!debt) return { ok: false, error: "No se encontró la deuda." };

  if (debt.payment_type === "cuotas") {
    // Revierte la última cuota pagada (la de fecha de pago más reciente):
    // desmarcarla borra su movimiento del ledger y su gasto espejo — atómico
    // vía unpayDebt() — y el trigger recalcula el estado de la deuda solo.
    const { data: last } = await supabase
      .from("debt_installments")
      .select("id")
      .eq("debt_id", id)
      .eq("paid", true)
      .order("paid_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) return { ok: false, error: "Esta deuda no tiene pagos que revertir." };

    await unpayDebt(supabase, id, last.id);
  } else {
    // Pago único: se revierte el pago completo.
    await unpayDebt(supabase, id, null);
  }

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
  // El `.eq("paid", false)` ya impide tocar una cuota pagada; acá se agrega
  // la guardia a nivel de deuda (R03): si la deuda entera está liquidada,
  // ninguna de sus cuotas se edita.
  const { data: inst } = await supabase
    .from("debt_installments")
    .select("debt_id")
    .eq("id", id)
    .maybeSingle();
  if (inst) {
    const blocked = await assertNotSettled(supabase, inst.debt_id);
    if (blocked) return { ok: false, error: blocked };
  }

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
  accountId?: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Pagar una cuota mueve dinero: sale de la cuenta (ledger) y cuenta como
  // gasto real. Desmarcar lo revierte. Ambos casos, atómicos vía
  // payDebt()/unpayDebt() (migration-v18) — el estado de la deuda lo
  // recalcula el trigger de la base al cambiar la cuota, dentro de la
  // misma transacción.
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
    if (!inst) return { ok: false };
    const ok = await payDebt(
      supabase,
      user.id,
      debtId,
      installmentId,
      Number(inst.amount),
      debt?.name ?? "",
      accountId,
    );
    if (!ok) return { ok: false, error: "No se pudo registrar el pago." };
  } else {
    await unpayDebt(supabase, debtId, installmentId);
  }

  revalidateAll();
  return { ok: true };
}

export async function toggleDebtPaid(
  id: string,
  paid: boolean,
  accountId?: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  if (paid) {
    const { data: debt } = await supabase
      .from("debts")
      .select("name, total_amount")
      .eq("id", id)
      .maybeSingle();
    if (!debt) return { ok: false };
    const ok = await payDebt(supabase, user.id, id, null, Number(debt.total_amount), debt.name, accountId);
    if (!ok) return { ok: false, error: "No se pudo registrar el pago." };
  } else {
    await unpayDebt(supabase, id, null);
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteDebt(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();

  // R03: eliminar una deuda NO devuelve dinero al balance. Antes acá se
  // BORRABAN los movimientos de pago — y borrar un retiro le devuelve ese
  // dinero al saldo, o sea que eliminar una deuda ya pagada "regalaba" de
  // vuelta lo que en la vida real ya habías pagado. Ahora los pagos que de
  // verdad ocurrieron se CONSERVAN, solo se les quita el vínculo con la
  // deuda y se re-etiquetan como movimiento manual, con una nota que
  // explica de dónde venían.
  const { data: debt } = await supabase
    .from("debts")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  const { data: insts } = await supabase
    .from("debt_installments")
    .select("id")
    .eq("debt_id", id);
  const { data: incs } = await supabase
    .from("debt_increments")
    .select("id")
    .eq("debt_id", id);
  const refIds = [id, ...(insts ?? []).map((i) => i.id)];
  const disbursementRefIds = [id, ...(incs ?? []).map((i) => i.id)];
  const nota = `Pago de deuda eliminada — ${debt?.name ?? "sin nombre"}`;
  const notaEntrada = `Préstamo de deuda eliminada — ${debt?.name ?? "sin nombre"}`;

  await Promise.all([
    // El dinero que te prestaron SÍ entró de verdad: mismo criterio que los
    // pagos — se conserva re-etiquetado, no se borra (borrarlo restaría de
    // tu balance dinero que sí recibiste).
    supabase
      .from("savings_movements")
      .update({ source: "manual", source_ref_id: null, note: notaEntrada })
      .eq("source", "debt_disbursement")
      .in("source_ref_id", disbursementRefIds),
    supabase
      .from("savings_movements")
      .update({ source: "manual", source_ref_id: null, note: nota })
      .eq("source", "debt_payment")
      .in("source_ref_id", refIds),
    // En `expenses`, source solo admite 'debt_payment' o null (ver
    // migration-v8) — null es justamente "registrado a mano".
    supabase
      .from("expenses")
      .update({ source: null, source_ref_id: null, note: nota })
      .eq("source", "debt_payment")
      .in("source_ref_id", refIds),
  ]);

  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la deuda." };
  revalidateAll();
  return { ok: true };
}
