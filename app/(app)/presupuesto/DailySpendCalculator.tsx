"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";

/** R07: calculadora de consulta — "tengo X para Y días, ¿cuánto por día?".
 *  NO está conectada al presupuesto que controla el límite mensual: es una
 *  herramienta para pensar, no una configuración. Se dice explícitamente en
 *  la UI para que no se confunda con el presupuesto real. */
export function DailySpendCalculator() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("");

  const amountN = Number(amount.replace(/,/g, ""));
  const daysN = Number(days);
  const valid = Number.isFinite(amountN) && amountN > 0 && Number.isFinite(daysN) && daysN > 0;
  const perDay = valid ? amountN / daysN : 0;

  return (
    <GlassCard>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-3 w-full text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon name="calc" size={18} className="text-primary shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink">Calcular gasto por día</span>
            <span className="block text-xs text-muted">
              Solo para consultar — no cambia tu presupuesto
            </span>
          </span>
        </span>
        <Icon
          name={open ? "chevronDown" : "chevronRight"}
          size={18}
          className="text-muted shrink-0"
        />
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto disponible" htmlFor="calc-amount">
              <MoneyInput
                id="calc-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="¿Para cuántos días?" htmlFor="calc-days">
              <Input
                id="calc-days"
                type="number"
                min={1}
                inputMode="numeric"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="15"
              />
            </Field>
          </div>

          <div className="rounded-2xl bg-primary-soft p-3 text-center">
            <p className="text-xs text-muted">Puedes gastar por día</p>
            <p className="text-2xl font-extrabold text-primary mt-0.5">
              {valid ? <Money value={perDay} /> : "—"}
            </p>
            {valid && (
              <p className="text-xs text-muted mt-1">
                <Money value={amountN} decimals={false} /> entre {daysN}{" "}
                {daysN === 1 ? "día" : "días"}
              </p>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
