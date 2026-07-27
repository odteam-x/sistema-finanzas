"use client";

import { useState } from "react";
import { Field, MoneyInput, Select } from "@/components/ui/Field";
import type { SavingsAccount } from "@/lib/types";

/** "Cuenta colchón" para ingresos variables (freelance/informal): el ingreso
 *  real entra aquí como cualquier depósito; "Pagarme esta quincena" (en la
 *  tarjeta de la cuenta) transfiere el monto fijo de abajo hacia la cuenta
 *  elegida. Los campos de monto/destino solo importan si el checkbox está
 *  marcado — de ahí la interactividad (mostrar/ocultar). */
export function CushionField({
  accountId,
  otherAccounts,
  defaultChecked,
  defaultAmount,
  defaultTargetId,
}: {
  accountId: string;
  otherAccounts: SavingsAccount[];
  defaultChecked: boolean;
  defaultAmount: number | null;
  defaultTargetId: string | null;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          name="is_cushion"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="size-4 accent-primary shrink-0"
        />
        Es mi cuenta colchón (ingresos variables)
      </label>
      {checked && otherAccounts.length > 0 && (
        <>
          <Field
            label="Monto fijo por quincena"
            htmlFor={`cushion-amount-${accountId}`}
            hint="Lo que te “pagas” con un toque desde esta cuenta."
            required
          >
            <MoneyInput
              id={`cushion-amount-${accountId}`}
              name="cushion_payout_amount"
              defaultValue={defaultAmount != null ? String(defaultAmount) : ""}
              required
            />
          </Field>
          <Field
            label="Se paga a"
            htmlFor={`cushion-target-${accountId}`}
            required
            hint="Debe ser una cuenta de la misma moneda."
          >
            <Select
              id={`cushion-target-${accountId}`}
              name="cushion_target_account_id"
              defaultValue={defaultTargetId ?? ""}
              required
            >
              <option value="">Elige una cuenta</option>
              {otherAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}
      {checked && otherAccounts.length === 0 && (
        <p className="text-xs text-muted">Crea otra cuenta primero — el colchón necesita a dónde pagarse.</p>
      )}
    </div>
  );
}
