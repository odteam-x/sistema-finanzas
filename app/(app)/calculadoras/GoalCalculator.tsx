"use client";

import { useState } from "react";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { FormModal } from "@/components/ui/FormModal";
import { formatDOP, todayISO } from "@/lib/format";
import { periodAfterN } from "@/lib/periods";
import { addGoal } from "../metas/actions";

export function GoalCalculator() {
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [periods, setPeriods] = useState("");

  const targetN = Number(target.replace(/[^0-9.]/g, "")) || 0;
  const savedN = Number(saved.replace(/[^0-9.]/g, "")) || 0;
  const periodsN = Math.min(240, Math.max(0, Math.floor(Number(periods) || 0)));
  const remaining = Math.max(0, targetN - savedN);
  const perPeriod = periodsN > 0 ? remaining / periodsN : null;
  const deadline = periodsN > 0 ? periodAfterN(todayISO(), periodsN).end : "";

  return (
    <div className="flex flex-col gap-4">
      <Field label="Monto objetivo" htmlFor="goal-target" required>
        <MoneyInput id="goal-target" value={target} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      <Field label="Ya ahorrado" htmlFor="goal-saved">
        <MoneyInput id="goal-saved" value={saved} onChange={(e) => setSaved(e.target.value)} />
      </Field>
      <Field label="Quincenas restantes" htmlFor="goal-periods" required>
        <Input
          id="goal-periods"
          type="number"
          inputMode="numeric"
          min={0}
          value={periods}
          onChange={(e) => setPeriods(e.target.value)}
        />
      </Field>

      <GlassCard className="text-center">
        <p className="text-xs text-muted">Debes ahorrar por quincena</p>
        <p className="text-money-md font-extrabold text-primary tabular mt-1">
          {perPeriod != null ? formatDOP(perPeriod, false) : "—"}
        </p>
        {targetN > 0 && (
          <p className="text-xs text-muted mt-1">Faltan {formatDOP(remaining, false)}</p>
        )}
      </GlassCard>

      {targetN > 0 && (
        <FormModal
          title="Guardar como meta"
          action={addGoal}
          submitLabel="Crear meta"
          triggerLabel="Guardar como meta"
          triggerVariant="secondary"
          triggerFull
        >
          <Field label="Nombre" htmlFor="calc-goal-name" required>
            <Input id="calc-goal-name" name="name" placeholder="Ej.: Vacaciones, Fondo de emergencia" required />
          </Field>
          <Field label="Monto objetivo" htmlFor="calc-goal-target" required>
            <MoneyInput id="calc-goal-target" name="target_amount" defaultValue={String(targetN)} required />
          </Field>
          <Field label="Ya ahorrado" htmlFor="calc-goal-saved">
            <MoneyInput id="calc-goal-saved" name="current_amount" defaultValue={savedN > 0 ? String(savedN) : ""} />
          </Field>
          <Field label="Fecha límite" htmlFor="calc-goal-deadline" hint="Calculada con las quincenas que ingresaste arriba.">
            <Input id="calc-goal-deadline" name="deadline" type="date" defaultValue={deadline} />
          </Field>
        </FormModal>
      )}
    </div>
  );
}
