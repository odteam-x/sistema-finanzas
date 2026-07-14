// Primer Route Handler de la app (todo lo demás usa Server Actions). Hace
// falta uno acá porque forzar una descarga real de archivo con
// Content-Disposition no es algo que una Server Action pueda devolver — su
// valor de retorno va serializado por el canal de React, no como Response.
import { requireUser } from "@/lib/auth";
import { getExpenses, getSalaries, getTags } from "@/lib/data";
import { todayISO } from "@/lib/format";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const kind = searchParams.get("kind") ?? "todo";

  const tags = await getTags();
  const tagName = (id: string | null) => (id ? (tags.find((t) => t.id === id)?.name ?? "") : "");

  const rows: string[][] = [["Tipo", "Fecha", "Monto", "Categoría/Concepto", "Nota"]];

  if (kind === "gastos" || kind === "todo") {
    const expenses = await getExpenses(from, to);
    for (const e of expenses) {
      rows.push(["Gasto", e.date, String(e.amount), tagName(e.tag_id), e.note ?? ""]);
    }
  }

  if (kind === "ingresos" || kind === "todo") {
    const salaries = await getSalaries();
    for (const s of salaries) {
      rows.push(["Ingreso", s.pay_date, String(s.amount), s.kind, s.note ?? ""]);
    }
  }

  const csv = "﻿" + toCsv(rows);
  const stamp = todayISO();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bolsillo-seguro-${stamp}.csv"`,
    },
  });
}
