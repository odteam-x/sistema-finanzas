"use server";
// Dedup para la cola offline (lib/offlineQueue.ts): antes de reintentar un
// ítem encolado, revisa si ya existe una fila equivalente reciente — cubre
// el caso "la Server Action SÍ corrió en el servidor, pero la respuesta
// nunca llegó al cliente" (conexión cortada a mitad), que antes encolaba de
// todas formas y al reintentar duplicaba el gasto/ingreso/movimiento.
//
// Mismo criterio de comparación que getExistingForDuplicateCheck()
// (movimientos/importar/actions.ts): monto + fecha + nota. Acá se suma una
// ventana de tiempo alrededor de cuándo se encoló el ítem — a diferencia de
// una importación masiva, dos gastos legítimos distintos SÍ pueden compartir
// monto/fecha/nota (dos cafés de RD$100 el mismo día); sin la ventana de
// tiempo el segundo se descartaría por error.
import { requireUser } from "./auth";
import { createClient } from "./supabase/server";
import type { QueuedActionKey } from "./offlineQueue";

const DEDUP_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function get(entries: [string, string][], key: string): string {
  return entries.find(([k]) => k === key)?.[1] ?? "";
}

/** true si ya existe una fila equivalente creada dentro de la ventana de
 *  dedup alrededor de `createdAt` (cuándo se encoló el ítem). */
export async function isAlreadySynced(
  actionKey: QueuedActionKey,
  entries: [string, string][],
  createdAt: number,
): Promise<boolean> {
  await requireUser();
  const supabase = await createClient();
  const amount = Number(get(entries, "amount"));
  if (!Number.isFinite(amount)) return false;
  const rawNote = get(entries, "note").trim();
  const note = rawNote || null;
  const from = new Date(createdAt - DEDUP_WINDOW_MS).toISOString();
  const to = new Date(createdAt + DEDUP_WINDOW_MS).toISOString();

  if (actionKey === "gasto") {
    let q = supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("amount", amount)
      .eq("date", get(entries, "date"))
      .is("deleted_at", null)
      .gte("created_at", from)
      .lte("created_at", to);
    q = note ? q.eq("note", note) : q.is("note", null);
    const { count } = await q;
    return (count ?? 0) > 0;
  }
  if (actionKey === "ingreso") {
    let q = supabase
      .from("salaries")
      .select("id", { count: "exact", head: true })
      .eq("amount", amount)
      .eq("pay_date", get(entries, "pay_date"))
      .is("deleted_at", null)
      .gte("created_at", from)
      .lte("created_at", to);
    q = note ? q.eq("note", note) : q.is("note", null);
    const { count } = await q;
    return (count ?? 0) > 0;
  }
  // movimiento: account_id siempre viene (campo required en el form), así
  // que sí se filtra por cuenta acá (a diferencia de gasto/ingreso, donde
  // puede venir vacío = "usa la cuenta por defecto", resuelta en el server).
  let q = supabase
    .from("savings_movements")
    .select("id", { count: "exact", head: true })
    .eq("amount", amount)
    .eq("date", get(entries, "date"))
    .eq("account_id", get(entries, "account_id"))
    .is("deleted_at", null)
    .gte("created_at", from)
    .lte("created_at", to);
  q = note ? q.eq("note", note) : q.is("note", null);
  const { count } = await q;
  return (count ?? 0) > 0;
}
