// Capa de acceso a datos de autenticación (defensa en profundidad):
// cada página/acción protegida verifica la sesión aquí, no solo el middleware.
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type { User } from "@supabase/supabase-js";

/** Devuelve el usuario autenticado o null (sin redirigir). */
export async function getUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Exige sesión; redirige a /login si no hay usuario. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
