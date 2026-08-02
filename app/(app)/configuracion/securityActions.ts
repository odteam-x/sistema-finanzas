"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions-shared";
import { PERSONAL_CODE_ERROR, isValidPersonalCode } from "@/lib/personalCode";
import {
  decryptPersonalCode,
  encryptPersonalCode,
  isPersonalCodeConfigured,
} from "@/lib/personalCodeCrypto";
import { clearCodeCookie, setCodeCookie } from "@/app/verificar/actions";

/** Paso 1 de 2 — ASIGNAR. Guarda el código pero lo deja INACTIVO: asignar y
 *  activar son dos decisiones distintas, y juntarlas dejaría a alguien
 *  encerrado fuera por un código que escribió mal dos veces seguidas y nunca
 *  llegó a probar. */
export async function assignPersonalCode(formData: FormData): Promise<ActionResult> {
  if (!isPersonalCodeConfigured()) {
    return { ok: false, error: "El código personal no está disponible en este servidor." };
  }
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");
  const confirm = String(formData.get("code_confirm") ?? "");

  // Repetida del cliente a propósito: nunca confiar solo en su validación.
  if (!isValidPersonalCode(code)) return { ok: false, error: PERSONAL_CODE_ERROR };
  if (code !== confirm) return { ok: false, error: "Los códigos no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profile")
    .upsert({ user_id: user.id, personal_code: await encryptPersonalCode(code) });
  if (error) return { ok: false, error: "No se pudo guardar el código." };

  revalidatePath("/configuracion");
  return { ok: true };
}

/** Paso 2 de 2 — ACTIVAR. Este es el que hace que se pida al iniciar sesión.
 *  Se emite la cookie de una vez: quien acaba de activarlo desde su sesión ya
 *  demostró ser él, y no tiene sentido echarlo para que vuelva a entrar. */
export async function activatePersonalCode(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase.from("user_profile").select("personal_code").maybeSingle();
  if (!data?.personal_code) {
    return { ok: false, error: "Primero asigna un código." };
  }

  const { error } = await supabase
    .from("user_profile")
    .update({ personal_code_active: true })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "No se pudo activar." };

  await setCodeCookie(user.id, "ok");
  revalidatePath("/configuracion");
  return { ok: true };
}

/** Desactivar exige el código actual: si bastara con pulsar un botón, a
 *  quien tomara el teléfono desbloqueado le sobraría con eso para quitarlo. */
export async function deactivatePersonalCode(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");
  const check = await checkPersonalCode(code);
  if (!check.ok) return check;

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profile")
    .update({ personal_code_active: false, personal_code: null })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "No se pudo desactivar." };

  // La cookie vieja diría "ok" durante ocho horas más; se tira para que el
  // estado del navegador no sobreviva al cambio.
  await clearCodeCookie();
  revalidatePath("/configuracion");
  return { ok: true };
}

/** Comprueba el código SIN redirigir. La usan el re-bloqueo por inactividad
 *  (AppLockGate) y todo lo que exija confirmar identidad dentro de la app,
 *  como apagar la biometría. */
export async function checkPersonalCode(code: string): Promise<ActionResult> {
  await requireUser();
  if (!isValidPersonalCode(code)) return { ok: false, error: PERSONAL_CODE_ERROR };
  if (!isPersonalCodeConfigured()) {
    return { ok: false, error: "El código personal no está disponible." };
  }

  const supabase = await createClient();
  const { data } = await supabase.from("user_profile").select("personal_code").maybeSingle();
  if (!data?.personal_code) return { ok: false, error: "No tienes un código asignado." };

  const stored = await decryptPersonalCode(data.personal_code);
  if (stored === null) {
    return { ok: false, error: "No se pudo leer tu código guardado." };
  }
  if (stored !== code) return { ok: false, error: "Código incorrecto." };
  return { ok: true };
}
