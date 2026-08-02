"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions-shared";
import { PERSONAL_CODE_ERROR, isValidPersonalCode } from "@/lib/personalCode";
import {
  decryptPersonalCode,
  encryptPersonalCode,
  isPersonalCodeConfigured,
} from "@/lib/personalCodeCrypto";
import { setCodeCookie } from "../actions";

/** Reautenticación antes de tocar nada del código.
 *
 *  Se pide la CONTRASEÑA de la cuenta, no el código personal: si ya se te
 *  olvidó el código, no puedes usarlo para recuperarse a sí mismo. Se valida
 *  contra Supabase Auth con el correo de la sesión activa, así que no hace
 *  falta escribirlo. */
async function reauthenticate(password: string): Promise<{ email: string } | { error: string }> {
  const user = await requireUser();
  if (!user.email) return { error: "Tu cuenta no tiene correo asociado." };
  if (!password) return { error: "Escribe tu contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (error) return { error: "Contraseña incorrecta." };
  return { email: user.email };
}

export interface RevealResult extends ActionResult {
  /** El código en claro, solo tras reautenticar. Nunca se manda al cliente
   *  sin haber comprobado la contraseña en esta misma llamada. */
  code?: string;
}

/** "Mostrar mi código actual" — la mitad de la recuperación que solo es
 *  posible porque el código se guarda cifrado de forma reversible y no
 *  hasheado (ver migration-v30). */
export async function revealPersonalCode(formData: FormData): Promise<RevealResult> {
  if (!isPersonalCodeConfigured()) {
    return { ok: false, error: "El código personal no está disponible." };
  }
  const auth = await reauthenticate(String(formData.get("password") ?? ""));
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data } = await supabase.from("user_profile").select("personal_code").maybeSingle();
  if (!data?.personal_code) return { ok: false, error: "Todavía no tienes un código asignado." };

  const code = await decryptPersonalCode(data.personal_code);
  if (code === null) {
    return {
      ok: false,
      error: "No se pudo leer tu código guardado. Asigna uno nuevo desde acá mismo.",
    };
  }
  return { ok: true, code };
}

/** "Asignar uno nuevo" — la otra mitad. Mejor que mostrarlo si sospechas que
 *  alguien más lo vio. Deja el código ACTIVO (quien llega acá ya lo tenía
 *  activo) y emite la cookie, para no dejar al usuario fuera tras cambiarlo. */
export async function resetPersonalCode(formData: FormData): Promise<ActionResult> {
  if (!isPersonalCodeConfigured()) {
    return { ok: false, error: "El código personal no está disponible." };
  }
  const user = await requireUser();
  const auth = await reauthenticate(String(formData.get("password") ?? ""));
  if ("error" in auth) return { ok: false, error: auth.error };

  const code = String(formData.get("code") ?? "");
  const confirm = String(formData.get("code_confirm") ?? "");
  if (!isValidPersonalCode(code)) return { ok: false, error: PERSONAL_CODE_ERROR };
  if (code !== confirm) return { ok: false, error: "Los códigos no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profile")
    .upsert({
      user_id: user.id,
      personal_code: await encryptPersonalCode(code),
      personal_code_active: true,
    });
  if (error) return { ok: false, error: "No se pudo guardar el código." };

  await setCodeCookie(user.id, "ok");
  return { ok: true };
}
