// Lógica de "cobro automático" de suscripciones vencidas. No es una Server
// Action (nadie la invoca desde un formulario) — es una función de servidor
// que se llama directamente al inicio de un Server Component (Dashboard y
// Suscripciones), antes de leer los datos que se van a mostrar. Como esas
// rutas ya son dinámicas (usan cookies de sesión), no hace falta
// revalidatePath: se escribe y en la misma petición se vuelve a leer.
import { requireUser } from "./auth";
import { createClient } from "./supabase/server";
import { getOrCreateDefaultAccountId } from "./accounts";
import { todayISO } from "./format";
import { stepChargeDate } from "./subscriptionDates";

/**
 * Genera gastos retroactivos para suscripciones activas con
 * next_charge_date vencido, y avanza esa fecha. Usa bloqueo optimista
 * (actualiza solo si next_charge_date sigue siendo el que se leyó) para
 * que no se duplique el gasto si Resumen y Suscripciones corren esta
 * función casi al mismo tiempo.
 */
export async function runSubscriptionCatchUp(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const today = todayISO();

  const { data: due } = await supabase
    .from("subscriptions")
    .select("*")
    // `deleted_at` faltaba: una suscripción borrada (borrado suave, R15)
    // seguía generando cargos cada vez que alguien abría Inicio, aunque ya no
    // apareciera en ninguna lista. getSubscriptions sí lo filtraba.
    .is("deleted_at", null)
    .eq("active", true)
    .lte("next_charge_date", today);
  if (!due || due.length === 0) return;

  for (const sub of due) {
    let cursor = sub.next_charge_date as string;
    while (cursor <= today) {
      const nextCursor = stepChargeDate(cursor, sub.frequency);

      const { data: updated } = await supabase
        .from("subscriptions")
        .update({ next_charge_date: nextCursor })
        .eq("id", sub.id)
        .eq("next_charge_date", cursor)
        .select("id");
      if (!updated || updated.length === 0) break;

      // El cargo va a una cuenta (la de la suscripción o la de por defecto),
      // para que el ledger refleje siempre el gasto recurrente. Sin cuenta,
      // no se registra nada — antes el gasto se insertaba igual y quedaba
      // fuera del ledger.
      const account_id = sub.account_id ?? (await getOrCreateDefaultAccountId(supabase, user.id));
      if (!account_id) {
        console.error(
          `[runSubscriptionCatchUp] sin cuenta disponible — cargo de "${sub.name}" (${cursor}) no se registró.`,
        );
        cursor = nextCursor;
        continue;
      }

      const { data: expense, error: expErr } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          date: cursor,
          tag_id: sub.tag_id,
          amount: sub.amount,
          note: `Suscripción: ${sub.name}`,
          account_id,
        })
        .select("id")
        .single();

      if (expErr || !expense) {
        console.error(`[runSubscriptionCatchUp] insert de gasto falló para "${sub.name}":`, expErr?.message);
        cursor = nextCursor;
        continue;
      }

      const { error: movErr } = await supabase.from("savings_movements").insert({
        account_id,
        user_id: user.id,
        kind: "retiro",
        amount: sub.amount,
        date: cursor,
        note: `Suscripción: ${sub.name}`,
        source: "subscription",
        source_ref_id: expense.id,
      });
      // Mismo patrón que addExpense() (presupuesto/actions.ts): si el
      // espejo falla, se revierte el gasto — mejor no registrar nada que
      // dejarlo fuera del ledger.
      if (movErr) {
        await supabase.from("expenses").delete().eq("id", expense.id);
        console.error(`[runSubscriptionCatchUp] espejo falló para "${sub.name}", gasto revertido:`, movErr.message);
      }

      cursor = nextCursor;
    }
  }
}
