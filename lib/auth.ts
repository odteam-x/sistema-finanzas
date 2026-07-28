// Capa de acceso a datos de autenticación (defensa en profundidad):
// cada página/acción protegida verifica la sesión aquí, no solo el middleware.
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { withAuthTimeout } from "./supabase/authTimeout";

/** Ver lib/supabase/authTimeout.ts para la causa raíz completa: sin este
 *  límite, una sesión vencida con la red inestable puede colgar la petición
 *  20-28 segundos dentro del propio SDK de Supabase. */
const AUTH_TIMEOUT_MS = 5000;

/** Identidad ya verificada. Solo lo que la app usa de verdad: en todo el
 *  código hay 65 lecturas de `user.id` y una de `user.email`, y las dos vienen
 *  dentro del propio JWT — no hacía falta el objeto User completo del
 *  servidor de Auth. */
export interface AuthUser {
  id: string;
  email: string | null;
}

/** Devuelve el usuario autenticado o null (sin redirigir).
 *
 * Verifica con `getClaims()`, no con `getUser()`. La diferencia es dónde
 * ocurre la verificación, no si ocurre:
 *
 * - `getUser()` pregunta al servidor de Auth en CADA llamada. Medido contra
 *   este proyecto: entre 90ms y 600ms por viaje. Se pagaba dos veces por
 *   navegación (una en el middleware y otra aquí), antes de la primera
 *   consulta de datos.
 * - `getClaims()` comprueba la FIRMA del JWT con la clave pública del
 *   proyecto. Este proyecto firma con ES256 (clave asimétrica, verificado en
 *   su endpoint JWKS), así que la comprobación es criptográfica y local: un
 *   token manipulado o caducado no pasa. El JWKS se descarga una vez por
 *   proceso y queda en una caché de módulo compartida entre instancias del
 *   cliente (GLOBAL_JWKS en auth-js), no una vez por petición.
 *
 * Si el proyecto volviera a una clave simétrica, `getClaims()` cae solo a
 * `getUser()` por red: se pierde la velocidad, nunca la verificación.
 *
 * `cache()` de React deduplica dentro de una misma petición: el layout, los
 * catch-ups y las páginas comparten el resultado. */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const result = await withAuthTimeout(supabase.auth.getClaims(), AUTH_TIMEOUT_MS);
  // result === null: se agotó el tiempo (ver authTimeout.ts) — se trata como
  // sesión inválida, nunca como sesión válida. Sin este límite, una sesión
  // vencida con la red inestable puede colgar esta llamada 20-28s.
  if (!result) return null;
  const { data, error } = result;
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  const email = data.claims.email;
  return { id: sub, email: typeof email === "string" ? email : null };
});

/** Exige sesión; redirige a /login si no hay usuario. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
