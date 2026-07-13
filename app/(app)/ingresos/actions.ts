"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";

function revalidateAll() {
  revalidatePath("/ingresos");
  revalidatePath("/dashboard");
  revalidatePath("/presupuesto");
  revalidatePath("/sugerencias");
  revalidatePath("/cuentas");
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
  const account_id = String(formData.get("account_id") ?? "") || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido." };
  }
  if (!pay_date) return { ok: false, error: "Selecciona la fecha del pago." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("salaries")
    .insert({ user_id: user.id, amount, pay_date, kind, note, account_id });
  if (error) return { ok: false, error: "No se pudo registrar el pago." };

  // Si se asoció una cuenta, refleja el ingreso como depósito para que el
  // saldo de la cuenta se actualice (misma fuente de verdad que Cuentas).
  if (account_id) {
    await supabase.from("savings_movements").insert({
      account_id,
      user_id: user.id,
      kind: "deposito",
      amount,
      date: pay_date,
      note: note ? `Ingreso: ${note}` : "Ingreso",
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteSalary(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("salaries").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidateAll();
  return { ok: true };
}
