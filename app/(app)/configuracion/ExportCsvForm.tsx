"use client";

import { useState } from "react";
import { Field, Select } from "@/components/ui/Field";
import { buttonClasses } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
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
          {/* Sin `name`: estos dos no se envían en un formulario, solo arman
              el href de descarga de abajo. */}
          <DateField id="csv-from" value={from} onChange={setFrom} required />
        </Field>
        <Field label="Hasta" htmlFor="csv-to">
          <DateField id="csv-to" value={to} onChange={setTo} required />
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
        className={buttonClasses({ size: "sm", className: "self-start" })}
      >
        Descargar CSV
      </a>
    </div>
  );
}
