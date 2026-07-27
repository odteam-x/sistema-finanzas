// Cliente de Supabase con la clave service_role — bypasea RLS a propósito.
// SOLO para app/api/cron/daily-alerts (sin sesión de usuario, no hay
// cookies que leer) y npm run check:coherence. Nunca en un flujo que
// responda a una petición del navegador de un usuario normal.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
