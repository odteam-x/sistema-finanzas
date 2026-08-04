"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { todayISO } from "@/lib/format";
import { addDebt } from "./actions";
import { NEW_CREDITOR } from "./creditors-shared";
import type { Creditor, SavingsAccount } from "@/lib/types";

export function AddDebtForm({
  triggerLabel = "Deuda",
  compact,
  accounts = [],
  creditors = [],
}: {
  triggerLabel?: string;
  accounts?: SavingsAccount[];
  creditors?: Creditor[];
  /** Disparador en píldora (más angosto que el botón sólido) — para usarlo
   *  en PageHeader sin competir visualmente con el título. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"unico" | "cuotas">("unico");
  const [kind, setKind] = useState<"prestamo" | "credito">("prestamo");
  const [creditorId, setCreditorId] = useState(creditors[0]?.id ?? NEW_CREDITOR);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = todayISO();

  function openModal() {
    setError(null);
    setType("unico");
    setKind("prestamo");
    setCreditorId(creditors[0]?.id ?? NEW_CREDITOR);
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
      {compact ? (
        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 rounded-pill font-semibold text-sm cursor-pointer transition-colors active:scale-[0.97] bg-primary-soft text-primary-fg hover:bg-primary-soft"
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

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva deuda">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="¿Qué tipo de deuda es?"
            htmlFor="debt-kind"
            hint={
              kind === "prestamo"
                ? "El monto entra a tu cuenta ahora, porque ese dinero ya está en tus manos."
                : "No entra dinero a tu cuenta: el gasto ya lo hiciste al comprar, y solo lo pagarás después."
            }
          >
            <Select
              id="debt-kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "prestamo" | "credito")}
            >
              <option value="prestamo">Me prestaron dinero (lo recibí)</option>
              <option value="credito">Compré a crédito / me fiaron</option>
            </Select>
          </Field>

          {/* El acreedor es una entidad propia desde v27: elegirlo de la lista
              evita que "Banco BHD" y "banco bhd" queden como dos personas
              distintas, que es lo que pasaba cuando era texto libre. */}
          {creditors.length > 0 && (
            <Field label="Acreedor" htmlFor="debt-creditor" required hint="A quién le debes.">
              <Select
                id="debt-creditor"
                name="creditor_id"
                value={creditorId}
                onChange={(e) => setCreditorId(e.target.value)}
              >
                {creditors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CREDITOR}>+ Nuevo acreedor…</option>
              </Select>
            </Field>
          )}

          {creditorId === NEW_CREDITOR && (
            <>
              {/* Sin acreedores todavía no hay nada que elegir: el Select se
                  salta y este hidden manda directo al camino de "crear uno". */}
              {creditors.length === 0 && (
                <input type="hidden" name="creditor_id" value={NEW_CREDITOR} />
              )}
              <Field
                label={creditors.length > 0 ? "Nombre del nuevo acreedor" : "Acreedor"}
                htmlFor="debt-creditor-name"
                required
                hint="Se guarda para reusarlo en tus próximas deudas."
              >
                <Input
                  id="debt-creditor-name"
                  name="creditor_name"
                  placeholder="Ej.: Banco BHD, Juan…"
                  required
                />
              </Field>
            </>
          )}

          <Field
            label="Descripción"
            htmlFor="name"
            hint="Opcional. Útil si le debes varias cosas al mismo acreedor."
          >
            <Input id="name" name="name" placeholder="Ej.: Préstamo del carro" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto total" htmlFor="total_amount" required>
              <MoneyInput id="total_amount" name="total_amount" required />
            </Field>
            <Field label="Fecha adquirida" htmlFor="acquired_date" required>
              <DateField
                id="acquired_date"
                name="acquired_date"
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
              <DateField id="due_date" name="due_date" />
            </Field>
          ) : (
            <div className="flex flex-col gap-4 rounded-tile bg-surface-sunken p-3">
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
                <DateField
                  id="first_due_date"
                  name="first_due_date"
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

          {kind === "prestamo" && accounts.length > 0 && (
            <Field
              label="¿A qué cuenta entró el dinero?"
              htmlFor="debt-account"
              hint="Se registra como un ingreso en esa cuenta."
            >
              <Select id="debt-account" name="account_id" defaultValue={accounts[0]?.id}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Nota" htmlFor="note">
            <Input id="note" name="note" placeholder="Opcional" />
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
              Crear deuda
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
