"use server";

import { revalidateEverything } from "@/lib/revalidate";
import { requireUser } from "@/lib/auth";
import { restoreRows, type UndoToken } from "@/lib/softDelete";
import type { ActionResult } from "@/lib/actions-shared";

/** Deshacer un borrado (R15). Una sola acción para toda la app: como el
 *  borrado es suave, restaurar es siempre lo mismo — poner `deleted_at` en
 *  NULL — sin importar de qué tabla venga. Se revalida todo porque un
 *  registro restaurado puede afectar balances, presupuesto y metas a la vez. */
export async function undoDelete(token: UndoToken): Promise<ActionResult> {
  await requireUser();
  const ok = await restoreRows(token);
  if (!ok) return { ok: false, error: "No se pudo restaurar." };
  revalidateEverything();
  return { ok: true };
}
