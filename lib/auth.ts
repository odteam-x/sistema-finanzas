// Capa de acceso a datos de autenticación (defensa en profundidad):
// cada página/acción protegida verifica la sesión aquí, no solo el middleware.
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type { User } from "@supabase/supabase-js";

/** Devuelve el usuario autenticado o null (sin redirigir).
 *
 * `supabase.auth.getUser()` no lee una cookie nada más: valida el JWT contra
 * el servidor de Supabase, un viaje de red real. Sin memoizar, una sola
 * carga de Inicio lo llamaba 3 veces (layout + runSalaryCatchUp +
 * runSubscriptionCatchUp) — tres round-trips en serie por la misma
 * pregunta. `cache()` de React deduplica llamadas idénticas dentro de una
 * misma petición: la primera pega a la red, el resto reusa esa promesa. */
export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Exige sesión; redirige a /login si no hay usuario. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
