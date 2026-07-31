"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/dashboard");
  revalidatePath("/movimientos");
  revalidatePath("/presupuesto");
  revalidatePath("/presupuesto/categorias");
  revalidatePath("/ingresos");
  revalidatePath("/balance");
  revalidatePath("/metas");
  revalidatePath("/deudas");
  revalidatePath("/deudas/historial");
  revalidatePath("/cobros");
  revalidatePath("/suscripciones");
  revalidatePath("/calendario");
  revalidatePath("/configuracion");
  return { ok: true };
}
