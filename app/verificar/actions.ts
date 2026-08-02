"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions-shared";
import { PERSONAL_CODE_ERROR, isValidPersonalCode } from "@/lib/personalCode";
import {
  CODE_COOKIE,
  CODE_COOKIE_MAX_AGE,
  type CodeCookieState,
  decryptPersonalCode,
  isPersonalCodeConfigured,
  signCodeCookie,
} from "@/lib/personalCodeCrypto";

/** Emite la cookie que dice que este navegador ya pasó (o no necesita pasar)
 *  el código. La leen tanto el proxy como esta ruta. */
export async function setCodeCookie(userId: string, state: CodeCookieState): Promise<void> {
  const jar = await cookies();
  jar.set(CODE_COOKIE, await signCodeCookie(userId, state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CODE_COOKIE_MAX_AGE,
  });
}

/** Se llama al cerrar sesión y al cambiar/desactivar el código: si la cookie
 *  sobreviviera a un cambio, el código nuevo no se pediría hasta que venciera
 *  la vieja. */
export async function clearCodeCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(CODE_COOKIE);
}

/** Verifica el código contra el valor guardado (cifrado) del usuario.
 *
 *  Se compara en el SERVIDOR a propósito: el bloqueo anterior comparaba un
 *  hash en localStorage, así que quien abriera las herramientas del navegador
 *  podía saltárselo, y desde otro dispositivo ni siquiera aparecía. */
export async function verifyPersonalCode(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");

  // La misma validación que el formulario, repetida acá: nunca confiar solo
  // en la del cliente (15.0).
  if (!isValidPersonalCode(code)) return { ok: false, error: PERSONAL_CODE_ERROR };
  if (!isPersonalCodeConfigured()) return { ok: false, error: "El código personal no está disponible." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profile")
    .select("personal_code, personal_code_active")
    .maybeSingle();

  // Sin código activo no hay nada que verificar: se emite la cookie y se
  // sigue, en vez de dejar al usuario atrapado en una pantalla que pide algo
  // que no existe.
  if (!data?.personal_code_active || !data.personal_code) {
    await setCodeCookie(user.id, "off");
    redirect("/dashboard");
  }

  const stored = await decryptPersonalCode(data.personal_code);
  if (stored === null) {
    // Solo pasa si PERSONAL_CODE_SECRET cambió después de guardar el código.
    // Decirlo tal cual evita que el usuario pruebe su código veinte veces
    // convencido de que se equivocó.
    return {
      ok: false,
      error: "No se pudo leer tu código guardado. Usa “¿Olvidaste tu código?” para asignar uno nuevo.",
    };
  }
  if (stored !== code) return { ok: false, error: "Código incorrecto." };

  await setCodeCookie(user.id, "ok");
  redirect("/dashboard");
}
