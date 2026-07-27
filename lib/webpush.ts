// Envío de push real (Bloque 12) — server-only: firma cada mensaje con la
// clave VAPID privada (nunca sale de esta capa) y lo despacha a cada
// suscripción del usuario. Un mismo usuario puede tener varios dispositivos
// suscritos (celular + laptop); se manda a todos.
import "server-only";
import webpush from "web-push";
import { createClient } from "./supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;
function ensureConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Ruta a abrir al tocar el aviso — ver notificationclick en public/sw.js. */
  url?: string;
}

/** Manda `payload` a todas las suscripciones del usuario dado. Recibe el
 *  cliente de Supabase ya armado (con sesión normal o service_role, según
 *  quién llame) para no acoplar este módulo a un contexto de auth
 *  específico — el cron (sin sesión) y una Server Action (con sesión) lo
 *  usan distinto. Limpia suscripciones que el navegador ya dio de baja
 *  (404/410) para no seguir intentando en vano. */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return; // VAPID sin configurar: no-op silencioso

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) {
    // No se traga en silencio: si la tabla no existe (migration-v25.sql sin
    // correr) o hay un problema de RLS, mejor que quede en los logs del
    // servidor que perderse como si nunca hubiera habido nada que avisar.
    console.error("sendPushToUser: no se pudo leer push_subscriptions:", error.message);
    return;
  }
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
        // Otros errores (red, 5xx del proveedor): se ignoran acá, no hay
        // reintento — el próximo disparo (inmediato o del cron) ya vuelve a
        // intentar con el estado más reciente.
      }
    }),
  );
}

/** Atajo para Server Actions: ya corren con la sesión del usuario, así que
 *  el cliente normal (RLS) alcanza. */
export async function sendPushToCurrentUser(userId: string, payload: PushPayload): Promise<void> {
  const supabase = await createClient();
  await sendPushToUser(supabase, userId, payload);
}
