"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Select } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import type { Debt } from "@/lib/types";
import { linkDebtToGoal, unlinkDebtFromGoal } from "./actions";

/** R14: el vínculo meta↔deuda se crea desde la META, nunca desde la deuda. */
export function LinkDebtButton({
  goalId,
  available,
}: {
  goalId: string;
  available: Debt[];
}) {
  const [open, setOpen] = useState(false);
  const [debtId, setDebtId] = useState(available[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  if (available.length === 0) return null;

  function confirm() {
    startTransition(async () => {
      await linkDebtToGoal(goalId, debtId);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setDebtId(available[0]?.id ?? "");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer"
      >
        <Icon name="debt" size={13} />
        Vincular deuda
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Vincular una deuda a esta meta">
        <p className="text-sm text-muted -mt-1">
          La meta avanzará conforme pagues esa deuda. Útil si compraste algo con dinero
          prestado.
        </p>
        <div className="mt-4">
          <Field label="Deuda" htmlFor={`link-debt-${goalId}`}>
            <Select
              id={`link-debt-${goalId}`}
              value={debtId}
              onChange={(e) => setDebtId(e.target.value)}
            >
              {available.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} full>
            Cancelar
          </Button>
          <Button onClick={confirm} loading={pending} full>
            Vincular
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** Desglose de las deudas vinculadas + cuánto aporta cada una. */
export function LinkedDebtsList({
  linked,
}: {
  linked: { debt: Debt; paid: number }[];
}) {
  const [unlinking, setUnlinking] = useState<Debt | null>(null);
  const [pending, startTransition] = useTransition();

  if (linked.length === 0) return null;

  function confirmUnlink() {
    if (!unlinking) return;
    const id = unlinking.id;
    startTransition(async () => {
      await unlinkDebtFromGoal(id);
      setUnlinking(null);
    });
  }

  return (
    <>
      <ul className="mt-2 flex flex-col gap-1">
        {linked.map(({ debt, paid }) => (
          <li key={debt.id} className="flex items-center justify-between gap-2 text-xs">
            <Link href="/deudas" className="text-muted truncate min-w-0 hover:text-primary">
              <Icon name="debt" size={11} className="inline mr-1" />
              {debt.name}
            </Link>
            <span className="flex items-center gap-1 shrink-0">
              <span className="font-semibold text-ink">
                <Money value={paid} decimals={false} />
              </span>
              <button
                onClick={() => setUnlinking(debt)}
                aria-label={`Desvincular ${debt.name}`}
                className="grid place-items-center size-6 rounded-full text-muted hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          </li>
        ))}
      </ul>

      <Modal
        open={unlinking !== null}
        onClose={() => setUnlinking(null)}
        title="¿Desvincular esta deuda?"
      >
        <p className="text-sm text-muted -mt-1">
          El progreso que aportaba{" "}
          <span className="font-semibold text-ink">
            <Money value={linked.find((l) => l.debt.id === unlinking?.id)?.paid ?? 0} />
          </span>{" "}
          se descontará de esta meta. La deuda en sí no se toca.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setUnlinking(null)} full>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmUnlink} loading={pending} full>
            Desvincular
          </Button>
        </div>
      </Modal>
    </>
  );
}
