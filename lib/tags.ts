// Siembra de categorías por defecto — mismo patrón que runSalaryCatchUp /
// runSubscriptionCatchUp: se llama al inicio de un Server Component, antes
// de leer los datos que se van a mostrar, no es una Server Action.
import "server-only";
import { requireUser } from "./auth";
import { createClient } from "./supabase/server";

/** Categorías relevantes para República Dominicana, no traducidas de una
 *  app gringa (nada de "Groceries"/"Utilities" genéricos). */
const DEFAULT_TAGS = [
  "Colmado",
  "Transporte / Concho",
  "Luz (EDE)",
  "Agua (CAASD)",
  "Internet / Cable",
  "Salud",
  "Comida fuera",
];

/** Si el usuario no tiene NINGUNA etiqueta todavía (ni siquiera una
 *  eliminada — se cuenta sobre la tabla completa, no solo las vivas, para
 *  no re-sembrar sobre alguien que borró todas las suyas a propósito),
 *  crea el set por defecto. Editables/eliminables desde el día uno, no
 *  fijas — esto solo reduce la fricción de arrancar con la lista vacía. */
export async function seedDefaultTagsIfEmpty(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { count } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count && count > 0) return;

  await supabase
    .from("tags")
    .insert(DEFAULT_TAGS.map((name) => ({ user_id: user.id, name, color: "primary" })));
}
