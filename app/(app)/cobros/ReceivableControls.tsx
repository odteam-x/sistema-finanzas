"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { formatDateShort } from "@/lib/format";
import type { ReceivableInstallment, SavingsAccount } from "@/lib/types";
import { toggleReceivableInstallment, toggleReceivableCollected } from "./actions";

/** Al recibir un pago se pregunta a qué cuenta ENTRA el dinero (R10).
 *  Con una sola cuenta no hay nada que elegir, así que no agrega fricción. */
function useAccountPicker(accounts: SavingsAccount[], onConfirm: (accountId?: string) => void) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");

  function start() {
    if (accounts.length > 1) {
      setAccountId(accounts[0]?.id ?? "");
      setOpen(true);
    } else {
      onConfirm(accounts[0]?.id);
    }
  }

  function confirm() {
    setOpen(false);
    onConfirm(accountId);
  }

  const picker = (
    <Modal open={open} onClose={() => setOpen(false)} title="¿A qué cuenta entra el dinero?">
      <Field label="Cuenta" htmlFor="rec-account">
        <Select id="rec-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)} full>
          Cancelar
        </Button>
        <Button onClick={confirm} full>
          Confirmar cobro
        </Button>
      </div>
    </Modal>
  );

  return { start, picker };
}

export function ReceivableInstallmentRow({
  installment,
  overdue,
  accounts,
}: {
  installment: ReceivableInstallment;
  overdue: boolean;
  accounts: SavingsAccount[];
}) {
  const [pending, startTransition] = useTransition();
  const i = installment;

  function apply(accountId?: string) {
    startTransition(() => {
      toggleReceivableInstallment(i.id, i.receivable_id, !i.paid, accountId).then(() => {});
    });
  }

  const { start, picker } = useAccountPicker(accounts, apply);

  return (
    <div className="flex items-center gap-1.5 py-1">
      <button
        onClick={() => (i.paid ? apply() : start())}
        disabled={pending}
        className="flex items-center gap-2.5 flex-1 min-w-0 min-h-11 text-left cursor-pointer disabled:opacity-60"
      >
        <span
          className={cn(
            "grid place-items-center size-6 rounded-tile border-2 shrink-0 transition-colors",
            i.paid ? "bg-primary border-primary text-white" : "border-line-strong text-transparent",
          )}
        >
          <Icon name="check" size={14} />
        </span>
        <span className="text-sm text-ink flex-1 min-w-0">
          Cuota {i.seq}
          <span className="text-muted"> · {formatDateShort(i.due_date)}</span>
        </span>
        {!i.paid && overdue && (
          <span className="text-xs font-bold text-danger shrink-0">vencida</span>
        )}
        <span
          className={cn(
            "text-sm font-semibold shrink-0",
            i.paid ? "text-muted line-through" : "text-ink",
          )}
        >
          <Money value={Number(i.amount)} />
        </span>
      </button>
      {picker}
    </div>
  );
}

export function ReceivableCollectedToggle({
  id,
  paid,
  accounts,
}: {
  id: string;
  paid: boolean;
  accounts: SavingsAccount[];
}) {
  const [pending, startTransition] = useTransition();

  function apply(accountId?: string) {
    startTransition(() => toggleReceivableCollected(id, !paid, accountId).then(() => {}));
  }

  const { start, picker } = useAccountPicker(accounts, apply);

  return (
    <>
      <button
        onClick={() => (paid ? apply() : start())}
        disabled={pending}
        className="flex items-center gap-2.5 w-full py-1 text-left cursor-pointer disabled:opacity-60"
      >
        <span
          className={cn(
            "grid place-items-center size-6 rounded-tile border-2 shrink-0 transition-colors",
            paid ? "bg-primary border-primary text-white" : "border-line-strong text-transparent",
          )}
        >
          <Icon name="check" size={14} />
        </span>
        <span className={cn("text-sm flex-1", paid ? "text-muted line-through" : "text-ink")}>
          {paid ? "Cobrado" : "Marcar como cobrado"}
        </span>
      </button>
      {picker}
    </>
  );
}

/** Las cuotas de un cobro, colapsadas a lo accionable. Gemelo de
 *  InstallmentList (deudas/DebtControls.tsx) — misma pared de filas idénticas,
 *  mismo criterio: se ve lo vencido y lo próximo, el resto a un toque.
 *
 *  No se comparte un solo componente entre las dos pantallas porque las filas
 *  son distintas de verdad: una marca "pagada" y descuenta de una cuenta, la
 *  otra marca "cobrada" y suma. Compartirlo obligaría a parametrizar la fila
 *  entera para ahorrar quince líneas de envoltorio. */
export function ReceivableInstallmentList({
  installments,
  today,
  accounts,
}: {
  installments: ReceivableInstallment[];
  today: string;
  accounts: SavingsAccount[];
}) {
  const [abierto, setAbierto] = useState(false);

  const esVencida = (i: ReceivableInstallment) => !i.paid && i.due_date < today;
  const vencidas = installments.filter(esVencida);
  const proxima = installments.find((i) => !i.paid && !esVencida(i));

  const destacadas = [...vencidas, ...(proxima ? [proxima] : [])];
  const colapsable = installments.length > 3 && destacadas.length < installments.length;
  const visibles = !colapsable || abierto ? installments : destacadas;

  return (
    <>
      <div className="flex flex-col divide-y divide-line">
        {visibles.map((i) => (
          <ReceivableInstallmentRow
            key={i.id}
            installment={i}
            overdue={esVencida(i)}
            accounts={accounts}
          />
        ))}
      </div>

      {colapsable && (
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="mt-1 flex items-center gap-1 min-h-11 text-xs font-semibold text-primary-fg cursor-pointer"
        >
          <Icon
            name="chevronDown"
            size={15}
            className={cn("transition-transform", abierto && "rotate-180")}
          />
          {abierto ? "Ver solo lo pendiente" : `Ver las ${installments.length} cuotas`}
        </button>
      )}
    </>
  );
}
