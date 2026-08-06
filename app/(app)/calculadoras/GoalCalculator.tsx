"use client";

import { useState } from "react";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { formatDOP, todayISO } from "@/lib/format";
import { periodAfterN, type PeriodDays } from "@/lib/periods";
import { addGoal } from "../metas/actions";

/** `periodDays` llega desde el servidor: las quincenas de este usuario
 *  arrancan en SUS días de cobro, y este componente es de cliente, así que
 *  no puede consultarlos por su cuenta. */
export function GoalCalculator({ periodDays }: { periodDays: PeriodDays }) {
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [periods, setPeriods] = useState("");

  const targetN = Number(target.replace(/[^0-9.]/g, "")) || 0;
  const savedN = Number(saved.replace(/[^0-9.]/g, "")) || 0;
  const periodsN = Math.min(240, Math.max(0, Math.floor(Number(periods) || 0)));
  const remaining = Math.max(0, targetN - savedN);
  const perPeriod = periodsN > 0 ? remaining / periodsN : null;
  const deadline = periodsN > 0 ? periodAfterN(todayISO(), periodsN, periodDays).end : "";

  return (
    <div className="flex flex-col gap-4">
      {/* El resultado ARRIBA, no debajo de los campos: se actualiza en vivo
          mientras escribes, y en móvil quedaba fuera de la pantalla justo
          cuando el teclado está abierto — o sea, invisible siempre que
          servía de algo. */}
      <div className="rounded-hero tone-calc bg-gradient-brand px-5 py-6 text-center shadow-hero overflow-hidden">
        <p className="text-sm font-medium text-on-brand-muted">Debes ahorrar por quincena</p>
        <p className="money-hero font-extrabold text-on-brand tabular mt-0.5">
          {perPeriod != null ? formatDOP(perPeriod, false) : "—"}
        </p>
        <p className="text-xs text-on-brand-muted mt-1.5">
          {targetN > 0 ? `Faltan ${formatDOP(remaining, false)}` : "Completa el objetivo y las quincenas"}
        </p>
      </div>

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
            <DateField id="calc-goal-deadline" name="deadline" defaultValue={deadline} />
          </Field>
        </FormModal>
      )}
    </div>
  );
}
