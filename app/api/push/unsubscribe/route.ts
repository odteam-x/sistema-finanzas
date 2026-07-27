import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autenticado." }, { status: 401 });

  let body: { endpoint?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) return Response.json({ error: "Falta el endpoint." }, { status: 400 });

  const supabase = await createClient();
  // RLS ya limita el delete a filas del propio usuario — el filtro por
  // user_id acá es cinturón y tirantes, no la única barrera.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);

  return Response.json({ ok: true });
}
