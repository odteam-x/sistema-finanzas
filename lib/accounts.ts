// Cuenta por defecto del ledger. Los movimientos espejo (gasto, sueldo,
// suscripción, pago de deuda) entran/salen de una cuenta; si el usuario no
// elige una, van a la cuenta por defecto. Así registrar un gasto nunca
// obliga a elegir cuenta, pero el saldo sigue siendo real.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountType } from "./types";

const TYPE_LABEL: Record<AccountType, string> = {
  efectivo: "Efectivo",
  banco: "Banco",
  tarjeta_debito: "Tarjeta débito",
  tarjeta_credito: "Tarjeta crédito",
  ahorro: "Ahorro",
};

/**
 * Devuelve el id de la cuenta por defecto del usuario, creándola ("Efectivo")
 * si aún no tiene ninguna. Idempotente: si ya hay cuentas pero ninguna marcada
 * como default, marca la primera. Pensado para llamarse desde Server Actions.
 */
export async function getOrCreateDefaultAccountId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: def } = await supabase
    .from("savings_accounts")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();
  if (def?.id) return def.id;

  // No hay default: usa la primera cuenta existente o crea "Efectivo".
  const { data: existing } = await supabase
    .from("savings_accounts")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("savings_accounts").update({ is_default: true }).eq("id", existing.id);
    return existing.id;
  }

  const { data: created } = await supabase
    .from("savings_accounts")
    .insert({ user_id: userId, name: "Efectivo", type: "efectivo", is_default: true })
    .select("id")
    .single();
  return created?.id ?? null;
}

/**
 * Resuelve el id de cuenta a partir de un método de cobro (efectivo, banco,
 * tarjeta…): reutiliza la primera cuenta existente de ese tipo si hay una, o
 * crea una nueva con nombre genérico ("Banco", "Tarjeta débito"…). Así
 * registrar un sueldo puede decir "cómo cobras" sin obligar a crear la
 * cuenta a mano en Balance primero.
 */
export async function getOrCreateAccountByType(
  supabase: SupabaseClient,
  userId: string,
  type: AccountType,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("savings_accounts")
    .select("id")
    .eq("type", type)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created } = await supabase
    .from("savings_accounts")
    .insert({ user_id: userId, name: TYPE_LABEL[type], type })
    .select("id")
    .single();
  return created?.id ?? null;
}
