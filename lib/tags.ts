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
  await requireUser();
  const supabase = await createClient();

  // Antes esto contaba acá y luego insertaba: dos viajes sin transacción que
  // los una. Como Presupuesto y Configuración llaman a esta función al inicio
  // de su render, dos cargas a la vez contaban 0 las dos e insertaban las 7
  // cada una — 14 categorías, siete repetidas. Ahora la decisión de sembrar y
  // la inserción ocurren dentro de la MISMA transacción en Postgres, con un
  // lock por usuario (migration-v29). El criterio no cambió: sigue mirando la
  // tabla completa, borradas incluidas.
  await supabase.rpc("seed_default_tags", { p_names: DEFAULT_TAGS });
}
