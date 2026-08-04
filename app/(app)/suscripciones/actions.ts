"use server";

import { revalidateEverything } from "@/lib/revalidate";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { softDeleteRows, type UndoableResult } from "@/lib/softDelete";
import { todayISO } from "@/lib/format";
import { nextFutureChargeDate } from "@/lib/subscriptionDates";
import type { SubscriptionFrequency } from "@/lib/types";


function parseFrequency(value: FormDataEntryValue | null): SubscriptionFrequency {
  return String(value ?? "") === "anual" ? "anual" : "mensual";
}

export async function addSubscription(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const frequency = parseFrequency(formData.get("frequency"));
  const next_charge_date = String(formData.get("next_charge_date") ?? "");
  const tag_id = String(formData.get("tag_id") ?? "") || null;
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
    tag_id,
    account_id,
  });
  if (error) return { ok: false, error: "No se pudo agregar la suscripción." };

  revalidateEverything();
  return { ok: true };
}

export async function updateSubscription(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const frequency = parseFrequency(formData.get("frequency"));
  const next_charge_date = String(formData.get("next_charge_date") ?? "");
  const tag_id = String(formData.get("tag_id") ?? "") || null;
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
    .update({ name, amount, frequency, next_charge_date, tag_id, account_id })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };

  revalidateEverything();
  return { ok: true };
}

export async function deleteSubscription(id: string): Promise<UndoableResult> {
  await requireUser();
  // R15: borrado suave, para poder deshacerlo desde el aviso.
  const res = await softDeleteRows("subscriptions", [id]);
  const error = res.ok ? null : true;
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateEverything();
  return { ok: true, undo: res.undo };
}

/** Pausa o reanuda una suscripción. `active` es el estado DESEADO — antes
 *  recibía el actual y lo invertía por dentro, que se presta a error; como no
 *  la llamaba nadie todavía, este es el momento de arreglarlo.
 *
 *  Pausar solo apaga la bandera: runSubscriptionCatchUp ya filtra por
 *  `active`, así que mientras esté pausada no genera nada.
 *
 *  Reanudar es lo delicado. El catch-up recorre `while (cursor <= today)`
 *  generando un gasto por CADA período vencido, así que reactivar una
 *  mensual que llevaba un año pausada dispararía doce gastos y doce retiros
 *  de golpe — cobros que nunca ocurrieron, justamente porque estuvo pausada.
 *  Por eso al reanudar se adelanta `next_charge_date` a la próxima fecha
 *  realmente futura: se retoma el cobro de aquí en adelante, sin cobrar el
 *  tiempo en que no estuvo activa. */
export async function toggleSubscriptionActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();

  if (!active) {
    const { error } = await supabase.from("subscriptions").update({ active: false }).eq("id", id);
    if (error) return { ok: false, error: "No se pudo pausar." };
    revalidateEverything();
    return { ok: true };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("next_charge_date, frequency")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, error: "No se encontró la suscripción." };

  const { error } = await supabase
    .from("subscriptions")
    .update({
      active: true,
      next_charge_date: nextFutureChargeDate(sub.next_charge_date, sub.frequency, todayISO()),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo reanudar." };
  revalidateEverything();
  return { ok: true };
}
