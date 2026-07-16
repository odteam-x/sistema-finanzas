"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultAccountId, getOrCreateAccountByType } from "@/lib/accounts";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import type { AccountType } from "@/lib/types";

const PAYMENT_METHODS: AccountType[] = ["efectivo", "banco", "tarjeta_debito", "tarjeta_credito"];

function revalidateAll() {
  revalidatePath("/ingresos");
  revalidatePath("/dashboard");
  revalidatePath("/presupuesto");
  revalidatePath("/sugerencias");
  revalidatePath("/balance");
  revalidatePath("/movimientos");
}

export async function saveSalarySettings(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const pay1 = Number(formData.get("pay_day_1"));
  const pay2 = Number(formData.get("pay_day_2"));
  const amount = parseAmount(formData.get("default_amount"));

  if (!(pay1 >= 1 && pay1 <= 31) || !(pay2 >= 1 && pay2 <= 31)) {
    return { ok: false, error: "Los días de pago deben estar entre 1 y 31." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("salary_settings").upsert({
    user_id: user.id,
    pay_day_1: pay1,
    pay_day_2: pay2,
    default_amount: Number.isFinite(amount) ? amount : 0,
  });
  if (error) return { ok: false, error: "No se pudo guardar la configuración." };

  revalidateAll();
  return { ok: true };
}

export async function addSalary(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const amount = parseAmount(formData.get("amount"));
  const pay_date = String(formData.get("pay_date") ?? "");
  const kind = String(formData.get("kind") ?? "quincena");
  const note = String(formData.get("note") ?? "").trim() || null;
  const chosenAccount = String(formData.get("account_id") ?? "") || null;
  const rawMethod = String(formData.get("payment_method") ?? "");
  const paymentMethod = PAYMENT_METHODS.includes(rawMethod as AccountType)
    ? (rawMethod as AccountType)
    : null;
  const tag_id = String(formData.get("tag_id") ?? "") || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  if (!pay_date) return { ok: false, error: "Selecciona la fecha del pago." };

  const supabase = await createClient();
  // El ledger es autoritativo: todo ingreso entra a una cuenta — la elegida
  // explícitamente, o la que corresponde al método de cobro (efectivo,
  // banco, tarjeta…), o la de por defecto si no se especificó nada.
  const account_id =
    chosenAccount ??
    (paymentMethod ? await getOrCreateAccountByType(supabase, user.id, paymentMethod) : null) ??
    (await getOrCreateDefaultAccountId(supabase, user.id));

  const { data: salary, error } = await supabase
    .from("salaries")
    .insert({ user_id: user.id, amount, pay_date, kind, note, account_id, tag_id })
    .select("id")
    .single();
  if (error || !salary) return { ok: false, error: "No se pudo registrar el pago." };

  if (account_id) {
    await supabase.from("savings_movements").insert({
      account_id,
      user_id: user.id,
      kind: "deposito",
      amount,
      date: pay_date,
      note: note ? `Ingreso: ${note}` : "Ingreso",
      source: "salary",
      source_ref_id: salary.id,
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteSalary(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  // Limpia primero el movimiento espejo del ledger (evita saldos huérfanos).
  await supabase
    .from("savings_movements")
    .delete()
    .eq("source", "salary")
    .eq("source_ref_id", id);
  const { error } = await supabase.from("salaries").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateAll();
  return { ok: true };
}
