"use client";

import { useState } from "react";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatDOP } from "@/lib/format";

export function GoalCalculator() {
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [periods, setPeriods] = useState("");

  const targetN = Number(target.replace(/[^0-9.]/g, "")) || 0;
  const savedN = Number(saved.replace(/[^0-9.]/g, "")) || 0;
  const periodsN = Math.max(0, Math.floor(Number(periods) || 0));
  const remaining = Math.max(0, targetN - savedN);
  const perPeriod = periodsN > 0 ? remaining / periodsN : null;

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
    </div>
  );
}
