// Acreditación automática del sueldo: igual patrón que
// runSubscriptionCatchUp — se llama al inicio de un Server Component antes
// de leer los datos que se van a mostrar, no es una Server Action.
import { requireUser } from "./auth";
import { createClient } from "./supabase/server";
import { getOrCreateDefaultAccountId, getOrCreateAccountByType } from "./accounts";
import { stepPayDate } from "./periods";
import { todayISO } from "./format";
import type { AccountType, PayFrequency } from "./types";

/**
 * Genera pagos retroactivos para cada fecha de cobro vencida (next_pay_date
 * <= hoy) y avanza esa fecha, igual que las suscripciones. Bloqueo
 * optimista: solo inserta si next_pay_date sigue siendo el que se leyó, para
 * no duplicar el ingreso si dos pantallas corren esto casi a la vez.
 */
export async function runSalaryCatchUp(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const today = todayISO();

  const { data: settings } = await supabase
    .from("salary_settings")
    .select("next_pay_date, frequency, payment_method, default_amount")
    .maybeSingle();
  if (!settings?.next_pay_date || settings.default_amount <= 0) return;

  const freq = settings.frequency as PayFrequency;
  let cursor = settings.next_pay_date as string;

  while (cursor <= today) {
    const nextCursor = stepPayDate(cursor, freq);

    const { data: updated } = await supabase
      .from("salary_settings")
      .update({ next_pay_date: nextCursor })
      .eq("user_id", user.id)
      .eq("next_pay_date", cursor)
      .select("user_id");
    if (!updated || updated.length === 0) break;

    const account_id = settings.payment_method
      ? await getOrCreateAccountByType(supabase, user.id, settings.payment_method as AccountType)
      : await getOrCreateDefaultAccountId(supabase, user.id);

    // confirmed: false — todavía no sabemos que este cobro de verdad llegó
    // (esto corre solo porque se cumplió la fecha configurada, no porque el
    // usuario avisó nada). El movimiento espejo en el ledger se difiere
    // hasta que lo confirme (ver confirmSalary en ingresos/actions.ts) —
    // así "Disponible" no cuenta dinero que aún no se sabe si llegó.
    await supabase.from("salaries").insert({
      user_id: user.id,
      amount: settings.default_amount,
      pay_date: cursor,
      kind: "quincena",
      note: "Ingreso automático",
      account_id,
      confirmed: false,
    });

    cursor = nextCursor;
  }
}
