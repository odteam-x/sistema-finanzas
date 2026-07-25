"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/actions-shared";
import type { CsvDateFormat } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
  revalidatePath("/balance");
  revalidatePath("/presupuesto");
}

export async function saveImportProfile(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const date_column = String(formData.get("date_column") ?? "").trim();
  const description_column = String(formData.get("description_column") ?? "").trim();
  const amount_column = String(formData.get("amount_column") ?? "").trim() || null;
  const debit_column = String(formData.get("debit_column") ?? "").trim() || null;
  const credit_column = String(formData.get("credit_column") ?? "").trim() || null;
  const date_format = String(formData.get("date_format") ?? "YYYY-MM-DD") as CsvDateFormat;
  const decimal_separator = String(formData.get("decimal_separator") ?? ".") as "." | ",";

  if (!name) return { ok: false, error: "Dale un nombre a este banco (ej. \"Popular\")." };
  if (!date_column || !description_column) {
    return { ok: false, error: "Faltan columnas por mapear." };
  }
  if (!amount_column && !(debit_column && credit_column)) {
    return { ok: false, error: "Indica la columna de monto, o las de débito y crédito." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("import_profiles").upsert(
    {
      user_id: user.id,
      name,
      date_column,
      description_column,
      amount_column,
      debit_column,
      credit_column,
      date_format,
      decimal_separator,
    },
    { onConflict: "user_id,name" },
  );
  if (error) return { ok: false, error: "No se pudo guardar el mapeo." };
  revalidatePath("/movimientos/importar");
  return { ok: true };
}

export async function deleteImportProfile(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("import_profiles").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidatePath("/movimientos/importar");
  return { ok: true };
}

export interface ExistingForDuplicateCheck {
  date: string;
  amount: number;
  note: string | null;
}

/** Movimientos ya existentes de la cuenta elegida, en el rango de fechas del
 *  CSV — se traen una sola vez y la comparación contra cada fila importada
 *  pasa entera en el cliente, sin ida y vuelta al servidor por fila. */
export async function getExistingForDuplicateCheck(
  accountId: string,
  fromDate: string,
  toDate: string,
): Promise<ExistingForDuplicateCheck[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("savings_movements")
    .select("date, amount, note")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .gte("date", fromDate)
    .lte("date", toDate);
  return (data ?? []).map((r) => ({ date: r.date, amount: Number(r.amount), note: r.note }));
}

export interface ImportRow {
  date: string;
  amount: number;
  note: string;
  /** true = salió dinero (gasto) · false = entró dinero (depósito genérico). */
  isExpense: boolean;
}

/** Confirma la importación: cada fila de gasto se registra exactamente
 *  igual que addExpense() (gasto + espejo en el ledger); cada fila de
 *  depósito, igual que addMovement() (solo ledger) — mismas tablas, mismo
 *  patrón que ya usa toda la app, nada de un silo nuevo para lo importado. */
export async function confirmImport(accountId: string, rows: ImportRow[]): Promise<ActionResult & { count?: number }> {
  const user = await requireUser();
  if (rows.length === 0) return { ok: false, error: "No hay filas para importar." };
  if (rows.length > 500) return { ok: false, error: "Máximo 500 filas por importación." };

  const supabase = await createClient();
  let imported = 0;

  for (const row of rows) {
    if (!Number.isFinite(row.amount) || row.amount <= 0) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue;
    const note = row.note.trim().slice(0, 500) || (row.isExpense ? "Gasto importado" : "Ingreso importado");

    if (row.isExpense) {
      const { data: expense, error } = await supabase
        .from("expenses")
        .insert({ user_id: user.id, amount: row.amount, date: row.date, note, account_id: accountId })
        .select("id")
        .single();
      if (error || !expense) continue;
      const { error: movErr } = await supabase.from("savings_movements").insert({
        account_id: accountId,
        user_id: user.id,
        kind: "retiro",
        amount: row.amount,
        date: row.date,
        note: `Gasto: ${note}`,
        source: "manual",
        source_ref_id: expense.id,
      });
      // Mismo criterio que addExpense(): si el espejo falla, se revierte el
      // gasto — mejor no importar la fila que dejarla fuera del ledger.
      if (movErr) {
        await supabase.from("expenses").delete().eq("id", expense.id);
        continue;
      }
    } else {
      const { error } = await supabase.from("savings_movements").insert({
        account_id: accountId,
        user_id: user.id,
        kind: "deposito",
        amount: row.amount,
        date: row.date,
        note,
        source: "manual",
      });
      if (error) continue;
    }
    imported++;
  }

  if (imported === 0) return { ok: false, error: "No se pudo importar ninguna fila." };
  revalidateAll();
  return { ok: true, count: imported };
}
