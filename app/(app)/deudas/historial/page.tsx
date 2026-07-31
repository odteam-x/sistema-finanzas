import Link from "next/link";
import { getDebtIncrements, getDebts, getInstallments, getSavingsAccounts } from "@/lib/data";
import { groupDebts, isSettled, totalOfDebt } from "@/lib/debts";
import { todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { DebtGroupCard } from "../DebtGroupCard";

export const metadata = { title: "Historial de deudas · Cachin'" };

export default async function HistorialDeudasPage() {
  const today = todayISO();
  const [debts, installments, accounts, increments] = await Promise.all([
    getDebts(),
    getInstallments(),
    getSavingsAccounts(),
    getDebtIncrements(),
  ]);

  // Mismo criterio de "liquidada" que la vista principal (lib/debts.ts): se
  // calcula, no se confía en `status`, porque un incremento puede reabrir de
  // hecho una deuda que la base marcó pagada.
  const settled = debts.filter((d) => isSettled(d, installments, increments));
  const totalPaid = settled.reduce((s, d) => s + totalOfDebt(d, increments), 0);
  const groups = groupDebts(settled);

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
          <ul className="flex flex-col gap-3">
            {groups.map((g) => (
              <li key={g.key}>
                <DebtGroupCard
                  name={g.name}
                  debts={g.debts}
                  installments={installments}
                  increments={increments}
                  accounts={accounts}
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
