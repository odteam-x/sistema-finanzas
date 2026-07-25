"use client";

import { useRef, useState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { matchTagForNote } from "@/lib/categorize";
import type { CategorizationRule, Tag } from "@/lib/types";

/** Categoría + Nota del formulario de gasto, combinados: mientras el
 *  usuario escribe la nota, si coincide con una regla de auto-categorización
 *  se pre-llena la categoría — pero solo si el usuario no había tocado el
 *  selector él mismo, para nunca pisar una elección manual (ver
 *  lib/categorize.ts, Configuración → Reglas de categorización). */
export function ExpenseCategoryFields({
  tags,
  rules,
  idPrefix,
  defaultTagId,
}: {
  tags: Tag[];
  rules: CategorizationRule[];
  idPrefix: string;
  defaultTagId?: string;
}) {
  const [tagId, setTagId] = useState(defaultTagId ?? "");
  const touchedTag = useRef(false);

  function handleNoteChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (touchedTag.current) return;
    const suggested = matchTagForNote(e.target.value, rules);
    if (suggested) setTagId(suggested);
  }

  return (
    <>
      <Field
        label="Categoría"
        htmlFor={`${idPrefix}-cat`}
        hint="Categoría general del gasto (independiente del presupuesto por día)."
      >
        <Select
          id={`${idPrefix}-cat`}
          name="tag_id"
          value={tagId}
          onChange={(e) => {
            touchedTag.current = true;
            setTagId(e.target.value);
          }}
        >
          <option value="">General</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nota" htmlFor={`${idPrefix}-note`}>
        <Input id={`${idPrefix}-note`} name="note" placeholder="Opcional" onChange={handleNoteChange} />
      </Field>
    </>
  );
}
