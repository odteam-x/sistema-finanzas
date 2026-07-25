"use client";

import { useTransition } from "react";
import { Field, MoneyInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { daysAgoLabel } from "@/lib/currency";
import type { Currency } from "@/lib/types";
import { setExchangeRate } from "./actions";

const CURRENCY_LABEL: Record<Currency, string> = { DOP: "Peso dominicano", USD: "Dólar", EUR: "Euro" };

/** Solo se renderiza si el usuario tiene alguna cuenta en esa moneda — no
 *  tiene sentido pedir una tasa que nada usa todavía (ver page.tsx). */
export function ExchangeRateForm({
  currency,
  rate,
}: {
  currency: Currency;
  rate: { rate_to_dop: number; updated_at: string } | undefined;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await setExchangeRate(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <input type="hidden" name="currency" value={currency} />
      <div className="flex-1">
        <Field
          label={`${CURRENCY_LABEL[currency]} (${currency}) → RD$`}
          htmlFor={`rate-${currency}`}
          hint={rate ? `Actualizada ${daysAgoLabel(rate.updated_at)}` : "Sin configurar todavía"}
        >
          <MoneyInput
            id={`rate-${currency}`}
            name="rate_to_dop"
            defaultValue={rate ? String(rate.rate_to_dop) : ""}
            placeholder="Ej.: 60.50"
          />
        </Field>
      </div>
      <Button type="submit" loading={pending} size="sm">
        Guardar
      </Button>
    </form>
  );
}
