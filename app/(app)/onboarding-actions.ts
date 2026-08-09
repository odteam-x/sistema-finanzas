"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateEverything } from "@/lib/revalidate";
import type { ActionResult } from "@/lib/actions-shared";

/** Los dos pasos que se pueden omitir. Cerrado a propósito: los tres primeros
 *  —cuenta, ciclo de cobro y primer gasto— son lo que hace que las cifras de la
 *  app signifiquen algo, y saltárselos deja la pantalla mintiendo. */
const OMITIBLES = ["deudas", "seguridad"] as const;
export type PasoOmitible = (typeof OMITIBLES)[number];

/**
 * Marca un paso opcional como "ahora no".
 *
 * Omitido cuenta como resuelto para dejar de pedirlo, pero se guarda aparte de
 * los hechos: la tarjeta se colapsa en vez de desaparecer, así que quien lo
 * saltó puede volver sin ir a buscarlo a Configuración.
 */
export async function skipOnboardingStep(paso: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!OMITIBLES.includes(paso as PasoOmitible)) {
    return { ok: false, error: "Ese paso no se puede omitir." };
  }
  const supabase = await createClient();

  // Se lee y se reescribe el arreglo entero en vez de usar array_append: con
  // upsert no hay forma de expresar "añade a lo que ya hay", y un usuario
  // nuevo puede no tener fila todavía.
  const { data } = await supabase
    .from("user_profile")
    .select("onboarding_skipped")
    .maybeSingle();
  const actuales: string[] = data?.onboarding_skipped ?? [];
  if (actuales.includes(paso)) return { ok: true };

  const { error } = await supabase
    .from("user_profile")
    .upsert({ user_id: user.id, onboarding_skipped: [...actuales, paso] });
  if (error) return { ok: false, error: "No se pudo guardar." };

  revalidateEverything();
  return { ok: true };
}

/** Deshace un "ahora no": el paso vuelve a pedirse. */
export async function unskipOnboardingStep(paso: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profile")
    .select("onboarding_skipped")
    .maybeSingle();
  const actuales: string[] = data?.onboarding_skipped ?? [];

  const { error } = await supabase
    .from("user_profile")
    .upsert({ user_id: user.id, onboarding_skipped: actuales.filter((p) => p !== paso) });
  if (error) return { ok: false, error: "No se pudo guardar." };

  revalidateEverything();
  return { ok: true };
}

/** La bienvenida se ha visto. Se llama una sola vez, al tocar "Empezar". */
export async function markWelcomeSeen(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profile")
    .upsert({ user_id: user.id, welcome_seen: true });
  if (error) return { ok: false, error: "No se pudo guardar." };

  revalidateEverything();
  return { ok: true };
}
