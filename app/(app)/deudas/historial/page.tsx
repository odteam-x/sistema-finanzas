import Link from "next/link";
import {
  getCreditors,
  getDebtIncrements,
  getDebts,
  getInstallments,
  getSavingsAccounts,
} from "@/lib/data";
import { groupDebts, isSettled, totalOfDebt } from "@/lib/debts";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { DebtGroupCard } from "../DebtGroupCard";

export const metadata = { title: "Historial de deudas · Cachin'" };

export default async function HistorialDeudasPage({
  searchParams,
}: {
  searchParams: Promise<{ acreedor?: string }>;
}) {
  const sp = await searchParams;
  const today = todayISO();
  const [debts, installments, accounts, increments, creditors] = await Promise.all([
    getDebts(),
    getInstallments(),
    getSavingsAccounts(),
    getDebtIncrements(),
    getCreditors(),
  ]);

  // Mismo criterio de "liquidada" que la vista principal (lib/debts.ts): se
  // calcula, no se confía en `status`, porque un incremento puede reabrir de
  // hecho una deuda que la base marcó pagada.
  const settled = debts.filter((d) => isSettled(d, installments, increments));
  const totalPaid = settled.reduce((s, d) => s + totalOfDebt(d, increments), 0);
  const groups = groupDebts(settled, creditors);
  // El filtro afecta SOLO la lista; el "Total saldado" de arriba sigue siendo
  // el de todo el historial, para que no parezca que encogió.
  const visible = sp.acreedor ? groups.filter((g) => g.key === sp.acreedor) : groups;

  return (
    <>
      {/* El "volver" lo pone PageHeader solo (showBack por defecto). */}
      <PageHeader title="Historial" subtitle="Deudas que ya saldaste" />

      {settled.length === 0 ? (
        <EmptyState
          icon="debt"
          illustration="receipt"
          title="Todavía no has saldado ninguna deuda"
          message="Cuando termines de pagar una, se guarda aquí con todo su detalle."
          action={
            <Link
              href="/deudas"
              className="inline-flex items-center gap-1.5 rounded-pill border border-line-strong px-3.5 min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken transition-colors"
            >
              <Icon name="debt" size={16} />
              Ver deudas pendientes
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5">
            <StatTile
              emphasis="hero"
              label="Total saldado"
              value={<Money value={totalPaid} decimals={false} />}
              sub={`${settled.length} ${settled.length === 1 ? "deuda" : "deudas"}`}
              icon="check"
              tone="primary"
            />
          </div>

          {groups.length > 1 && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto px-1">
              {[{ key: "", name: "Todos" }, ...groups].map((g) => {
                const on = (sp.acreedor ?? "") === g.key;
                return (
                  <Link
                    key={g.key || "all"}
                    href={
                      g.key
                        ? `/deudas/historial?acreedor=${encodeURIComponent(g.key)}`
                        : "/deudas/historial"
                    }
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "shrink-0 inline-flex items-center rounded-pill px-3.5 min-h-11 text-sm font-semibold transition-colors",
                      on
                        ? "bg-primary-soft text-primary-fg"
                        : "border border-line-strong text-ink hover:bg-surface-sunken",
                    )}
                  >
                    {g.name}
                  </Link>
                );
              })}
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {visible.map((g) => (
              <li key={g.key}>
                <DebtGroupCard
                  name={g.name}
                  debts={g.debts}
                  installments={installments}
                  increments={increments}
                  accounts={accounts}
                  creditors={creditors}
                  today={today}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
