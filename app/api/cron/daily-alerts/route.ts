// Cron diario (ver vercel.json) — el único disparador de push que NO corre
// dentro de una petición de un usuario, así que necesita el cliente
// service_role (sin sesión que dé RLS) y protegerse con CRON_SECRET para
// que nadie más pueda invocarlo desde afuera.
//
// Alcance: deudas de pago único, CUOTAS de deuda y suscripciones activas que
// vencen en los próximos 3 días.
//
// Las cuotas se excluían antes con el argumento de que ya las cubría el aviso
// local al abrir la app. Dos motivos por los que no era cierto: ese aviso solo
// dispara cuando ABRES la app —o sea que te enteras del vencimiento justo
// cuando ya entraste a mirar, que es cuando menos falta hace—, y encima usaba
// `new Notification()`, que Safari no implementa: en iPhone no salía nada.
//
// Con las cuotas fuera, una cuenta con deudas a plazos y sin suscripciones no
// recibía un solo push nunca. Eso se leía como "las notificaciones no
// funcionan" cuando en realidad no había nada que enviar.
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { sendPushToUser } from "@/lib/webpush";
import { todayISO, addDaysISO, formatDateShort } from "@/lib/format";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return Response.json({ ok: true, skipped: "push no configurado" });

  const today = todayISO();
  const horizon = addDaysISO(today, 3);

  const { data: subsRows, error: subsError } = await supabase.from("push_subscriptions").select("user_id");
  if (subsError) {
    // No se traga el error como "0 suscritos" — eso escondería, por
    // ejemplo, que migration-v25.sql (la tabla push_subscriptions) todavía
    // no se corrió en Supabase. Aparece en los logs de la función en Vercel.
    console.error("daily-alerts: no se pudo leer push_subscriptions:", subsError.message);
    return Response.json({ ok: false, error: subsError.message }, { status: 500 });
  }
  const userIds = Array.from(new Set((subsRows ?? []).map((r) => r.user_id as string)));
  if (userIds.length === 0) return Response.json({ ok: true, notified: 0 });

  let notified = 0;
  for (const userId of userIds) {
    const [{ data: debts }, { data: installments }, { data: subscriptions }] = await Promise.all([
      supabase
        .from("debts")
        .select("name, due_date")
        .eq("user_id", userId)
        .eq("payment_type", "unico")
        .neq("status", "pagada")
        .is("deleted_at", null)
        .not("due_date", "is", null)
        .gte("due_date", today)
        .lte("due_date", horizon),
      // Las cuotas viven en otra tabla y no traen user_id propio: se filtran
      // por la deuda padre, que sí lo tiene. `debts!inner` fuerza el join, así
      // que una cuota de una deuda borrada suavemente no se cuela.
      supabase
        .from("debt_installments")
        .select("due_date, debts!inner(name, user_id, deleted_at)")
        .eq("paid", false)
        .eq("debts.user_id", userId)
        .is("debts.deleted_at", null)
        .gte("due_date", today)
        .lte("due_date", horizon),
      supabase
        .from("subscriptions")
        .select("name, next_charge_date")
        .eq("user_id", userId)
        .eq("active", true)
        .is("deleted_at", null)
        .gte("next_charge_date", today)
        .lte("next_charge_date", horizon),
    ]);

    const items = [
      ...(debts ?? []).map((d) => `${d.name} (${formatDateShort(d.due_date as string)})`),
      ...(installments ?? []).map((i) => {
        const padre = i.debts as unknown as { name: string } | null;
        return `${padre?.name ?? "Cuota"} (${formatDateShort(i.due_date as string)})`;
      }),
      ...(subscriptions ?? []).map((s) => `${s.name} (${formatDateShort(s.next_charge_date as string)})`),
    ];
    if (items.length === 0) continue;

    await sendPushToUser(supabase, userId, {
      title: items.length === 1 ? "Vencimiento próximo" : `${items.length} vencimientos próximos`,
      body: items.slice(0, 3).join(" · ") + (items.length > 3 ? "…" : ""),
      url: "/calendario",
    });
    notified++;
  }

  return Response.json({ ok: true, notified });
}
