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
        className="flex items-center gap-2.5 flex-1 min-w-0 py-0.5 text-left cursor-pointer disabled:opacity-60"
      >
        <span
          className={cn(
            "grid place-items-center size-6 rounded-md border-2 shrink-0 transition-colors",
            i.paid ? "bg-primary border-primary text-white" : "border-black/20 text-transparent",
          )}
        >
          <Icon name="check" size={14} />
        </span>
        <span className="text-sm text-ink flex-1 min-w-0">
          Cuota {i.seq}
          <span className="text-muted"> · {formatDateShort(i.due_date)}</span>
        </span>
        {!i.paid && overdue && (
          <span className="text-[0.7rem] font-bold text-danger shrink-0">vencida</span>
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
            "grid place-items-center size-6 rounded-md border-2 shrink-0 transition-colors",
            paid ? "bg-primary border-primary text-white" : "border-black/20 text-transparent",
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
