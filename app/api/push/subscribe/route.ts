// Route Handler (no Server Action): el navegador llama esto justo después de
// navigator.pushManager.subscribe(), desde código cliente puro (ver
// NotificationToggle.tsx) — no hay formulario ni necesidad de revalidatePath.
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autenticado." }, { status: 401 });

  let body: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "Suscripción incompleta." }, { status: 400 });
  }

  const supabase = await createClient();
  // Upsert por endpoint: el mismo navegador puede volver a suscribirse (ej.
  // tras limpiar datos del sitio) sin duplicar filas.
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: "endpoint" });
  if (error) return Response.json({ error: "No se pudo guardar la suscripción." }, { status: 500 });

  return Response.json({ ok: true });
}
