"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { todayISO } from "@/lib/format";
import { addDebt } from "./actions";

export function AddDebtForm({ triggerLabel = "Deuda" }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"unico" | "cuotas">("unico");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = todayISO();

  function openModal() {
    setError(null);
    setType("unico");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addDebt(fd);
      if (res?.ok) setOpen(false);
      else setError(res?.error ?? "Ocurrió un error.");
    });
  }

  return (
    <>
      <Button onClick={openModal}>
        <Icon name="plus" size={18} />
        {triggerLabel}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva deuda">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Acreedor / nombre" htmlFor="name" required>
            <Input id="name" name="name" placeholder="Ej.: Préstamo banco" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto total" htmlFor="total_amount" required>
              <MoneyInput id="total_amount" name="total_amount" required />
            </Field>
            <Field label="Fecha adquirida" htmlFor="acquired_date" required>
              <Input
                id="acquired_date"
                name="acquired_date"
                type="date"
                defaultValue={today}
                required
              />
            </Field>
          </div>

          <Field label="Tipo de pago" htmlFor="payment_type">
            <Select
              id="payment_type"
              name="payment_type"
              value={type}
              onChange={(e) => setType(e.target.value as "unico" | "cuotas")}
            >
              <option value="unico">Pago único</option>
              <option value="cuotas">En cuotas</option>
            </Select>
          </Field>

          {type === "unico" ? (
            <Field label="Fecha de pago" htmlFor="due_date">
              <Input id="due_date" name="due_date" type="date" />
            </Field>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl bg-black/[0.03] p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="N.º de cuotas" htmlFor="installments_count" required>
                  <Input
                    id="installments_count"
                    name="installments_count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    defaultValue={3}
                    required
                  />
                </Field>
                <Field label="Frecuencia" htmlFor="frequency">
                  <Select id="frequency" name="frequency" defaultValue="mensual">
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </Select>
                </Field>
              </div>
              <Field label="Primera cuota (fecha)" htmlFor="first_due_date" required>
                <Input
                  id="first_due_date"
                  name="first_due_date"
                  type="date"
                  defaultValue={today}
                  required
                />
              </Field>
              <Field
                label="Monto por cuota"
                htmlFor="installment_amount"
                hint="Déjalo vacío para dividir el total entre las cuotas."
              >
                <MoneyInput id="installment_amount" name="installment_amount" />
              </Field>
            </div>
          )}

          <Field label="Nota" htmlFor="note">
            <Input id="note" name="note" placeholder="Opcional" />
          </Field>

          {error && (
            <p
              className="text-sm font-medium text-danger bg-danger-soft rounded-2xl px-3 py-2 flex items-center gap-2"
              role="alert"
            >
              <Icon name="alert" size={18} />
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} full>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} full>
              Crear deuda
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
