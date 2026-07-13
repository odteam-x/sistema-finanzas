"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dominicanHolidays } from "@/lib/holidays-do";
import type { ActionResult } from "@/lib/actions-shared";
import type { ExceptionKind } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/calendario");
  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
}

export async function setException(
  date: string,
  kind: ExceptionKind,
  label: string | null = null,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_calendar_exceptions")
    .upsert(
      { user_id: user.id, date, kind, label },
      { onConflict: "user_id,date" },
    );
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidateAll();
  return { ok: true };
}

export async function removeException(date: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_calendar_exceptions")
    .delete()
    .eq("user_id", user.id)
    .eq("date", date);
  if (error) return { ok: false, error: "No se pudo quitar." };
  revalidateAll();
  return { ok: true };
}

export async function loadHolidays(year: number): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const rows = dominicanHolidays(year).map((h) => ({
    user_id: user.id,
    date: h.date,
    kind: "feriado" as const,
    label: h.label,
  }));
  const { error } = await supabase
    .from("work_calendar_exceptions")
    .upsert(rows, { onConflict: "user_id,date", ignoreDuplicates: true });
  if (error) return { ok: false, error: "No se pudieron cargar los feriados." };
  revalidateAll();
  return { ok: true };
}
