"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { addReceivable } from "./actions";

/** Formulario propio (no FormModal) porque el tipo de pago cambia qué
 *  campos se muestran — mismo patrón que AddDebtForm en Deudas. */
export function NewReceivableForm({
  today,
  triggerLabel = "Nuevo",
  trigger,
}: {
  today: string;
  triggerLabel?: string;
  trigger?: "pill";
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"unico" | "cuotas">("unico");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openModal() {
    setError(null);
    setType("unico");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addReceivable(fd);
      if (res?.ok) setOpen(false);
      else setError(res?.error ?? "Ocurrió un error.");
    });
  }

  return (
    <>
      {trigger === "pill" ? (
        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-1.5 min-h-9 rounded-full font-semibold text-sm cursor-pointer transition-colors active:scale-[0.97] bg-primary-soft text-primary hover:bg-primary/15 px-3"
        >
          <Icon name="plus" size={16} />
          {triggerLabel}
        </button>
      ) : (
        <Button onClick={openModal}>
          <Icon name="plus" size={18} />
          {triggerLabel}
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo por cobrar">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="¿Qué es?" htmlFor="rec-kind">
            <Select id="rec-kind" name="kind" defaultValue="cobro">
              <option value="cobro">Me deben dinero</option>
              <option value="prestamo">Le presté dinero a alguien</option>
            </Select>
          </Field>

          <Field label="Persona" htmlFor="rec-name" required>
            <Input id="rec-name" name="name" placeholder="Ej.: Juan" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto" htmlFor="rec-total" required>
              <MoneyInput id="rec-total" name="total_amount" required />
            </Field>
            <Field label="Desde" htmlFor="rec-acq" required>
              <Input id="rec-acq" name="acquired_date" type="date" defaultValue={today} required />
            </Field>
          </div>

          <Field label="¿Cómo te lo van a pagar?" htmlFor="rec-ptype">
            <Select
              id="rec-ptype"
              name="payment_type"
              value={type}
              onChange={(e) => setType(e.target.value as "unico" | "cuotas")}
            >
              <option value="unico">De una sola vez</option>
              <option value="cuotas">En cuotas</option>
            </Select>
          </Field>

          {type === "unico" ? (
            <Field label="Fecha esperada de cobro" htmlFor="rec-due">
              <Input id="rec-due" name="due_date" type="date" />
            </Field>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl bg-black/[0.03] p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="N.º de cuotas" htmlFor="rec-count" required>
                  <Input
                    id="rec-count"
                    name="installments_count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    defaultValue={3}
                    required
                  />
                </Field>
                <Field label="Frecuencia" htmlFor="rec-freq">
                  <Select id="rec-freq" name="frequency" defaultValue="mensual">
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </Select>
                </Field>
              </div>
              <Field label="Primera cuota (fecha)" htmlFor="rec-first" required>
                <Input id="rec-first" name="first_due_date" type="date" defaultValue={today} required />
              </Field>
              <Field
                label="Monto por cuota"
                htmlFor="rec-instamt"
                hint="Déjalo vacío para dividir el total entre las cuotas."
              >
                <MoneyInput id="rec-instamt" name="installment_amount" />
              </Field>
            </div>
          )}

          <Field label="Nota" htmlFor="rec-note">
            <Input id="rec-note" name="note" placeholder="Opcional" />
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
              Registrar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
