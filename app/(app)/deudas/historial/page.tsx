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
import { RANGE_LABEL, parseRangePreset, rangeBounds, type RangePreset } from "@/lib/range";
import { hrefWith } from "@/lib/href";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { ActiveFilters } from "@/components/ui/ActiveFilters";
import { Icon } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { DebtGroupCard } from "../DebtGroupCard";

export const metadata = { title: "Historial de deudas · Cachin'" };

export default async function HistorialDeudasPage({
  searchParams,
}: {
  searchParams: Promise<{ acreedor?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRangePreset(sp.range);
  // Se recorta por `acquired_date` (cuándo la adquiriste). No por vencimiento:
  // acá todas están saldadas, así que no hay vencimiento pendiente que valga —
  // y además la ventana de rangeBounds() cierra HOY, así que sobre una fecha
  // futura no dejaría nada. "Cuándo terminé de pagarla" tampoco sirve: no es
  // una columna, y en pago único solo queda `status`, sin fecha, así que la
  // mitad del historial se caería del filtro sin explicación.
  const { from, to } = rangeBounds(range);
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
  // Los grupos del selector se arman sobre TODO el historial: si se armaran
  // sobre lo ya filtrado, el acreedor que estás mirando desaparecería del
  // propio menú que usaste para elegirlo.
  const groups = groupDebts(settled, creditors);

  // El filtro afecta SOLO la lista; el "Total saldado" de arriba sigue siendo
  // el de todo el historial, para que no parezca que encogió.
  const inRange = settled.filter(
    (d) => (!from || d.acquired_date >= from) && (!to || d.acquired_date <= to),
  );
  const visible = groupDebts(inRange, creditors).filter(
    (g) => !sp.acreedor || g.key === sp.acreedor,
  );

  const hrefFor = (next: { acreedor?: string | null; range?: string | null }) =>
    hrefWith("/deudas/historial", { acreedor: sp.acreedor, range: sp.range }, next);

  const acreedorName = groups.find((g) => g.key === sp.acreedor)?.name;
  const activeFilters = [
    acreedorName && { label: acreedorName, removeHref: hrefFor({ acreedor: null }) },
    // El chip dice SOBRE QUÉ FECHA recorta: "Últimos 3 meses" a secas no
    // aclara si es cuándo la adquiriste o cuándo la terminaste de pagar.
    range !== "todo" && {
      label: `Adquiridas: ${RANGE_LABEL[range].toLowerCase()}`,
      removeHref: hrefFor({ range: null }),
    },
  ].filter((f): f is { label: string; removeHref: string } => Boolean(f));

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

          <ActiveFilters filters={activeFilters} clearHref="/deudas/historial" />

          {/* Antes el acreedor era una fila de píldoras con scroll horizontal
              (una por acreedor, sin techo) y no había filtro de fecha. Los dos
              filtros son secundarios y del mismo peso, así que se ven igual —
              mismo criterio que Movimientos. */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {groups.length > 1 && (
              <FilterMenu
                label="Acreedor"
                value={acreedorName ?? "Todos"}
                options={[
                  { label: "Todos", href: hrefFor({ acreedor: null }), active: !sp.acreedor },
                  ...groups.map((g) => ({
                    label: g.name,
                    href: hrefFor({ acreedor: g.key }),
                    active: sp.acreedor === g.key,
                  })),
                ]}
              />
            )}
            <FilterMenu
              label="Rango"
              value={RANGE_LABEL[range]}
              options={(Object.keys(RANGE_LABEL) as RangePreset[]).map((r) => ({
                label: RANGE_LABEL[r],
                href: hrefFor({ range: r === "todo" ? null : r }),
                active: r === range,
              }))}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon="debt"
              title="Sin resultados"
              message="Ninguna deuda saldada coincide con este filtro."
              action={
                <Link
                  href="/deudas/historial"
                  className="inline-flex items-center gap-1.5 rounded-pill border border-line-strong px-3.5 min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken transition-colors"
                >
                  Quitar filtros
                </Link>
              }
            />
          ) : (
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
          )}
        </>
      )}
    </>
  );
}
