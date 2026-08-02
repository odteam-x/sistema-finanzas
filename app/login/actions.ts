"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
  /** Para los flujos que no navegan a ningún lado y solo dejan un aviso
   *  ("revisa tu correo"). */
  notice?: string | null;
}

/** Mínimo de Supabase Auth por defecto. Se valida acá además de en el
 *  servidor de Auth para poder decirlo antes y en español. */
const MIN_PASSWORD = 8;

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** La URL pública del sitio, para los enlaces que Supabase manda por correo.
 *  Se toma de las cabeceras de la propia petición en vez de una variable de
 *  entorno: así funciona igual en local, en las vistas previas de Vercel y en
 *  producción, sin configurar nada por entorno. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales inválidas. Verifica e intenta de nuevo." };
  }

  redirect("/dashboard");
}

/** Registro público. Hasta ahora las cuentas se creaban a mano desde el panel
 *  de Supabase, lo cual solo escala a una persona. */
export async function signup(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");

  if (!isEmail(email)) return { error: "Escribe un correo válido." };
  if (password.length < MIN_PASSWORD) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  }
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });

  if (error) {
    // El límite de intentos de Supabase Auth llega como 429. Merece un mensaje
    // propio: "no se pudo crear la cuenta" haría que el usuario reintentara en
    // bucle justo cuando lo que hay que hacer es esperar.
    if (error.status === 429) {
      return { error: "Demasiados intentos. Espera unos minutos y vuelve a probar." };
    }
    return { error: "No se pudo crear la cuenta. Verifica el correo e intenta de nuevo." };
  }

  // Con confirmación por correo activada, Supabase devuelve el usuario SIN
  // sesión. Y si el correo ya existía devuelve un usuario con `identities`
  // vacío: se responde igual que en el caso nuevo a propósito, para no
  // convertir el registro en una forma de averiguar quién tiene cuenta.
  if (!data.session) {
    return {
      error: null,
      notice: "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja.",
    };
  }

  redirect("/dashboard");
}

/** Paso 1 de la recuperación: manda el enlace. */
export async function requestPasswordReset(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isEmail(email)) return { error: "Escribe un correo válido." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/auth/nueva-contrasena`,
  });

  if (error?.status === 429) {
    return { error: "Demasiados intentos. Espera unos minutos y vuelve a probar." };
  }

  // Mismo mensaje exista o no la cuenta: si dijéramos "ese correo no está
  // registrado", cualquiera podría usar este formulario para averiguar qué
  // correos tienen cuenta acá.
  return {
    error: null,
    notice: "Si ese correo tiene una cuenta, le enviamos un enlace para cambiar la contraseña.",
  };
}

/** Paso 2: ya con la sesión temporal del enlace, fija la contraseña nueva. */
export async function updatePassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");

  if (password.length < MIN_PASSWORD) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  }
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "No se pudo cambiar la contraseña. Pide un enlace nuevo." };
  }

  redirect("/dashboard");
}
