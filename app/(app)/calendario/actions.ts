"use server";

import { revalidateEverything } from "@/lib/revalidate";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dominicanHolidays } from "@/lib/holidays-do";
import type { ActionResult } from "@/lib/actions-shared";
import type { ExceptionKind } from "@/lib/types";

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
  revalidateEverything();
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
  revalidateEverything();
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
  revalidateEverything();
  return { ok: true };
}
