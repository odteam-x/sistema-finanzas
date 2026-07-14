"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { todayISO, addDaysISO } from "@/lib/format";

export function ExportCsvForm() {
  const today = todayISO();
  const [from, setFrom] = useState(addDaysISO(today, -90));
  const [to, setTo] = useState(today);
  const [kind, setKind] = useState("todo");

  const href = `/api/export/csv?from=${from}&to=${to}&kind=${kind}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Desde" htmlFor="csv-from">
          <Input id="csv-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Hasta" htmlFor="csv-to">
          <Input id="csv-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <Field label="Qué exportar" htmlFor="csv-kind">
        <Select
          id="csv-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="todo">Todo (ingresos y gastos)</option>
          <option value="gastos">Solo gastos</option>
          <option value="ingresos">Solo ingresos</option>
        </Select>
      </Field>
      <a
        href={href}
        download
        className="inline-flex items-center justify-center self-start rounded-full font-semibold min-h-9 px-4 text-sm bg-gradient-brand text-white shadow-sm hover:brightness-[0.97] active:brightness-95 transition-[filter] duration-150 cursor-pointer"
      >
        Descargar CSV
      </a>
    </div>
  );
}
