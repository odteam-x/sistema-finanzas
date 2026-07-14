"use client";

import { useState } from "react";
import { Field, Input, MoneyInput, Select } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatDOP } from "@/lib/format";

const FREQ_LABEL: Record<string, string> = {
  semanal: "semanal",
  quincenal: "quincenal",
  mensual: "mensual",
};

export function LoanCalculator() {
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("");
  const [rate, setRate] = useState("");
  const [frequency, setFrequency] = useState("mensual");

  const amountN = Number(amount.replace(/[^0-9.]/g, "")) || 0;
  const n = Math.max(0, Math.floor(Number(installments) || 0));
  const rateN = Number(rate.replace(/[^0-9.]/g, "")) || 0;

  // Interés simple total repartido en n cuotas iguales (cálculo básico,
  // no amortización francesa) — suficiente para una estimación rápida.
  const totalWithInterest = amountN * (1 + rateN / 100);
  const installmentAmount = n > 0 ? totalWithInterest / n : null;

  return (
    <div className="flex flex-col gap-4">
      <Field label="Monto del préstamo" htmlFor="loan-amount" required>
        <MoneyInput id="loan-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Número de cuotas" htmlFor="loan-installments" required>
        <Input
          id="loan-installments"
          type="number"
          inputMode="numeric"
          min={0}
          value={installments}
          onChange={(e) => setInstallments(e.target.value)}
        />
      </Field>
      <Field label="Frecuencia" htmlFor="loan-frequency">
        <Select id="loan-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          <option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
        </Select>
      </Field>
      <Field label="Interés total" htmlFor="loan-rate" hint="Opcional. % sobre el monto total del préstamo.">
        <Input id="loan-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
      </Field>

      <GlassCard className="text-center">
        <p className="text-xs text-muted">Cuota {FREQ_LABEL[frequency]}</p>
        <p className="text-money-md font-extrabold text-primary tabular mt-1">
          {installmentAmount != null ? formatDOP(installmentAmount, false) : "—"}
        </p>
        {amountN > 0 && rateN > 0 && (
          <p className="text-xs text-muted mt-1">Total con interés: {formatDOP(totalWithInterest, false)}</p>
        )}
      </GlassCard>
    </div>
  );
}
