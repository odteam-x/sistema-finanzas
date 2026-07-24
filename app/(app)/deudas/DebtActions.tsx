"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Money } from "@/components/ui/Money";
import { formatDateShort } from "@/lib/format";
import type { DebtIncrement } from "@/lib/types";
import { addDebtIncrement, deleteDebtIncrement, reopenDebt } from "./actions";

/** R02: botón "+" para volver a deberle a la misma persona sin crear una
 *  deuda nueva. Guarda un registro en el historial; NO mueve dinero. */
export function AddIncrementButton({ debtId, today }: { debtId: string; today: string }) {
  return (
    <FormModal
      title="Agregar monto a la deuda"
      action={addDebtIncrement}
      submitLabel="Agregar"
      trigger="icon"
      triggerIcon="plus"
      triggerAriaLabel="Agregar monto a esta deuda"
    >
      <input type="hidden" name="debt_id" value={debtId} />
      <p className="text-sm text-muted -mt-1">
        Se suma al total de esta deuda y queda en el historial. No mueve dinero de tus
        cuentas — solo pasa cuando registras un pago.
      </p>
      <Field label="Monto" htmlFor={`inc-amt-${debtId}`} required>
        <MoneyInput id={`inc-amt-${debtId}`} name="amount" required />
      </Field>
      <Field label="Fecha" htmlFor={`inc-date-${debtId}`} required>
        <Input id={`inc-date-${debtId}`} name="date" type="date" defaultValue={today} required />
      </Field>
      <Field label="Nota" htmlFor={`inc-note-${debtId}`}>
        <Input id={`inc-note-${debtId}`} name="note" placeholder="Opcional" />
      </Field>
    </FormModal>
  );
}

/** Desglose expandible: monto original + cada aumento por separado, para
 *  que se vea de dónde sale el total (R02). */
export function IncrementHistory({
  originalAmount,
  increments,
}: {
  originalAmount: number;
  increments: DebtIncrement[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (increments.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer"
      >
        <Icon name={open ? "chevronDown" : "chevronRight"} size={13} />
        {increments.length} {increments.length === 1 ? "aumento" : "aumentos"}
      </button>

      {open && (
        <ul className="mt-1.5 flex flex-col gap-1 border-l-2 border-black/10 pl-2.5">
          <li className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted">Monto original</span>
            <span className="font-semibold text-ink">
              <Money value={originalAmount} />
            </span>
          </li>
          {increments.map((inc) => (
            <li key={inc.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted truncate min-w-0">
                {formatDateShort(inc.date)}
                {inc.note ? ` · ${inc.note}` : ""}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="font-semibold text-ink">
                  +<Money value={Number(inc.amount)} />
                </span>
                <button
                  onClick={() =>
                    startTransition(() => {
                      deleteDebtIncrement(inc.id).then(() => {});
                    })
                  }
                  disabled={pending}
                  aria-label="Eliminar este aumento"
                  className="grid place-items-center size-6 rounded-full text-muted hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Icon name="trash" size={12} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** R03: una deuda liquidada es de solo lectura. Reabrirla revierte su
 *  último pago — acción explícita y confirmada, porque devuelve dinero al
 *  balance (al contrario de eliminarla, que no lo devuelve). */
export function ReopenDebtButton({ debtId, debtName }: { debtId: string; debtName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await reopenDebt(debtId);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer"
      >
        <Icon name="repeat" size={13} />
        Reabrir
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`¿Reabrir “${debtName}”?`}>
        <p className="text-sm text-muted -mt-1">
          Se revierte el último pago registrado: ese dinero vuelve a tu cuenta y la deuda
          pasa a estar pendiente otra vez. Podrás volver a editarla.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} full>
            Cancelar
          </Button>
          <Button onClick={confirm} loading={pending} full>
            Reabrir deuda
          </Button>
        </div>
      </Modal>
    </>
  );
}
