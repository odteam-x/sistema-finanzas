// Catch-up: aplica las reglas de auto-categorización (lib/categorize.ts) a
// gastos YA registrados que quedaron sin categoría — mismo patrón que
// runSalaryCatchUp/runSubscriptionCatchUp/seedDefaultTagsIfEmpty (lib/tags.ts):
// se llama al inicio de un Server Component, no es una Server Action. Así una
// regla nueva (o una que ya existía) agrupa también el historial, no solo
// los gastos que se registren de ahora en adelante. Nunca pisa una
// categoría ya elegida a mano (solo toca tag_id IS NULL).
import "server-only";
import { requireUser } from "./auth";
import { createClient } from "./supabase/server";
import { matchTagForNote } from "./categorize";

export async function applyCategorizationRulesToPastExpenses(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rules } = await supabase
    .from("categorization_rules")
    .select("*")
    .eq("user_id", user.id);
  if (!rules || rules.length === 0) return;

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, note")
    .eq("user_id", user.id)
    .is("tag_id", null)
    .is("deleted_at", null)
    .not("note", "is", null);
  if (!expenses || expenses.length === 0) return;

  const updates = expenses
    .map((e) => ({ id: e.id as string, tag_id: matchTagForNote(e.note as string, rules) }))
    .filter((u): u is { id: string; tag_id: string } => u.tag_id !== null);
  if (updates.length === 0) return;

  await Promise.all(
    updates.map((u) => supabase.from("expenses").update({ tag_id: u.tag_id }).eq("id", u.id)),
  );
}
