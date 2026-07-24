import "server-only";
import { createClient } from "./supabase/server";
import { todayISO } from "./format";
import type { ActionResult } from "./actions-shared";

/** Tablas que soportan borrado suave (ver supabase/migration-v15.sql). */
export type SoftDeletableTable =
  | "salaries"
  | "expenses"
  | "savings_accounts"
  | "savings_movements"
  | "debts"
  | "debt_increments"
  | "receivables"
  | "goals"
  | "budget_categories"
  | "subscriptions"
  | "tags"
  | "work_calendar_exceptions";

/** Lo que el cliente necesita para poder deshacer.
 *  `also` cubre las filas relacionadas que cayeron con la principal — p. ej.
 *  un gasto arrastra su movimiento espejo del ledger, y deshacer tiene que
 *  restaurar los dos o el balance queda descuadrado. */
export interface UndoToken {
  table: SoftDeletableTable;
  ids: string[];
  also?: UndoToken[];
}

/** Resultado de una acción que se puede deshacer. */
export type UndoableResult = ActionResult & { undo?: UndoToken };

/** Marca filas como eliminadas sin borrarlas. Devuelve el token para
 *  deshacer — es lo que el toast le pasa de vuelta a `restoreRows`. */
export async function softDeleteRows(
  table: SoftDeletableTable,
  ids: string[],
): Promise<{ ok: boolean; undo?: UndoToken }> {
  if (ids.length === 0) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { ok: false };
  return { ok: true, undo: { table, ids } };
}

/** Deshacer: devuelve las filas a la vida, incluidas las relacionadas. */
export async function restoreRows(token: UndoToken): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(token.table)
    .update({ deleted_at: null })
    .in("id", token.ids);
  if (error) return false;

  for (const child of token.also ?? []) {
    const ok = await restoreRows(child);
    if (!ok) return false;
  }
  return true;
}

/** Fecha de hoy, reexportada para que las acciones no importen de dos
 *  módulos distintos solo para esto. */
export { todayISO };
