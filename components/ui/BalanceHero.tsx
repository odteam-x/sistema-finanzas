"use client";

import { useState } from "react";
import { MoneyValue } from "./MoneyValue";
import { Money } from "./Money";
import { Icon } from "./Icon";
import { readPrimaryAccount, writePrimaryAccount } from "@/lib/preferences";
import type { SavingsAccount } from "@/lib/types";

export interface AccountBalance {
  id: string;
  name: string;
  type: SavingsAccount["type"];
  balance: number;
  isSavings: boolean;
}

/** R12: dos tarjetas con propósitos distintos.
 *  1) "Balance actual" — el dinero de UNA cuenta (la que elijas; por
 *     defecto Efectivo). Es el "¿cuánto tengo a mano?".
 *  2) "Balance total" — todas las cuentas juntas, ahorros incluidos, con
 *     desglose. Es el "¿cuánto tengo en total?".
 *  La distinción se dice explícita en cada tarjeta para que no se lea como
 *  una inconsistencia entre dos números que no cuadran. */
export function BalanceHero({ accounts }: { accounts: AccountBalance[] }) {
  const [selectedId, setSelectedId] = useState<string>(() => {
    const saved = readPrimaryAccount();
    if (saved && accounts.some((a) => a.id === saved)) return saved;
    // Default: Efectivo. Si no hay, la primera cuenta.
    return accounts.find((a) => a.type === "efectivo")?.id ?? accounts[0]?.id ?? "";
  });
  const [expanded, setExpanded] = useState(false);

  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0];
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const savingsPart = accounts.filter((a) => a.isSavings).reduce((s, a) => s + a.balance, 0);

  function pick(id: string) {
    setSelectedId(id);
    writePrimaryAccount(id);
  }

  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* 1) Balance actual — una sola cuenta */}
      <div className="bg-gradient-brand rounded-[var(--radius-glass)] p-5 sm:p-6 overflow-hidden shadow-lg shadow-black/10">
        <p className="text-sm font-medium text-white/80 flex items-center gap-1.5">
          <Icon name="wallet" size={15} />
          Balance actual
        </p>
        <MoneyValue
          value={selected?.balance ?? 0}
          decimals={false}
          className="block text-4xl sm:text-5xl font-extrabold text-white mt-1 tracking-tight"
        />
        <p className="text-xs text-white/70 mt-1">
          Solo {selected?.name ?? "esta cuenta"} · no incluye ahorros de otras cuentas
        </p>

        {accounts.length > 1 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => pick(a.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  a.id === selected?.id
                    ? "bg-white text-primary"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2) Balance total — todas las cuentas, ahorros incluidos */}
      <div className="glass rounded-[var(--radius-glass)] p-4 sm:p-5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between gap-3 w-full text-left cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted flex items-center gap-1.5">
              <Icon name="bank" size={15} />
              Balance total
            </p>
            <MoneyValue
              value={total}
              decimals={false}
              className="block text-2xl sm:text-3xl font-extrabold text-ink mt-0.5 tracking-tight"
            />
            <p className="text-xs text-muted mt-0.5">
              Todas tus cuentas
              {savingsPart !== 0 && (
                <>
                  {" "}
                  · incluye <Money value={savingsPart} decimals={false} /> en ahorros
                </>
              )}
            </p>
          </div>
          <Icon
            name={expanded ? "chevronDown" : "chevronRight"}
            size={18}
            className="text-muted shrink-0"
          />
        </button>

        {expanded && (
          <ul className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-2">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted truncate min-w-0">
                  {a.name}
                  {a.isSavings && <span className="text-xs"> · ahorro</span>}
                </span>
                <span className="font-semibold text-ink shrink-0">
                  <Money value={a.balance} decimals={false} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
