"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { addReceivable } from "./actions";
import type { SavingsAccount } from "@/lib/types";

/** Formulario propio (no FormModal) porque el tipo de pago cambia qué
 *  campos se muestran — mismo patrón que AddDebtForm en Deudas. */
export function NewReceivableForm({
  today,
  triggerLabel = "Nuevo",
  trigger,
  accounts = [],
}: {
  today: string;
  triggerLabel?: string;
  trigger?: "pill";
  accounts?: SavingsAccount[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"unico" | "cuotas">("unico");
  const [kind, setKind] = useState<"cobro" | "prestamo">("cobro");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openModal() {
    setError(null);
    setType("unico");
    setKind("cobro");
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
          className="inline-flex items-center justify-center gap-1.5 min-h-11 rounded-pill font-semibold text-sm cursor-pointer transition-colors active:scale-[0.97] bg-primary-soft text-primary-fg hover:bg-primary-soft px-3"
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
          <Field
            label="¿Qué es?"
            htmlFor="rec-kind"
            hint={
              kind === "prestamo"
                ? "El monto sale de tu cuenta ahora, porque ese dinero ya se lo diste."
                : undefined
            }
          >
            <Select
              id="rec-kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "cobro" | "prestamo")}
            >
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
              <DateField id="rec-acq" name="acquired_date" defaultValue={today} required />
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
              <DateField id="rec-due" name="due_date" />
            </Field>
          ) : (
            <div className="flex flex-col gap-4 rounded-tile bg-surface-sunken p-3">
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
                <DateField id="rec-first" name="first_due_date" defaultValue={today} required />
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

          {kind === "prestamo" && accounts.length > 0 && (
            <Field
              label="¿De qué cuenta sale?"
              htmlFor="rec-account"
              hint="Se registra como un retiro de esa cuenta."
            >
              <Select id="rec-account" name="account_id" defaultValue={accounts[0]?.id}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Nota" htmlFor="rec-note">
            <Input id="rec-note" name="note" placeholder="Opcional" />
          </Field>

          {error && (
            <p
              className="text-sm font-medium text-danger bg-tint-expense rounded-tile px-3 py-2 flex items-center gap-2"
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
