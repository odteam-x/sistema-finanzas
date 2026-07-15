import Link from "next/link";
import { getExpenses, getTags } from "@/lib/data";
import { formatDOP, formatMonthShort, todayISO, toISODate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { BarCompare, type Bar } from "@/components/charts/BarCompare";
import { DonutChart } from "@/components/charts/DonutChart";
import { Money } from "@/components/ui/Money";

export const metadata = { title: "Reportes · Bolsillo Seguro" };

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const MONTH_OPTIONS = [3, 6, 12];
const MAX_MONTHS = 12;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const tagFilter = sp.tag || "";

  const today = todayISO();
  const [ty, tm] = today.split("-").map(Number);

  // Se trae siempre la ventana más ancha (12 meses) una sola vez: sirve
  // tanto para el rango elegido como para saber cuánta historia real hay
  // y así deshabilitar los rangos que no tienen suficientes datos.
  const allMonths = Array.from({ length: MAX_MONTHS }, (_, i) => {
    const d = new Date(ty, tm - 1 - (MAX_MONTHS - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const widestFromISO = toISODate(new Date(allMonths[0].year, allMonths[0].month, 1, 12));

  const [widestExpenses, tags] = await Promise.all([
    getExpenses(widestFromISO, today),
    getTags(),
  ]);

  const earliestDate = widestExpenses.reduce<string | null>(
    (min, e) => (min === null || e.date < min ? e.date : min),
    null,
  );
  const monthsOfHistory = earliestDate
    ? (ty - Number(earliestDate.slice(0, 4))) * 12 + (tm - Number(earliestDate.slice(5, 7))) + 1
    : 0;
  const availableOptions = MONTH_OPTIONS.filter((m) => monthsOfHistory === 0 || m <= monthsOfHistory);

  const requestedMonths = Number(sp.months);
  const monthsCount = MONTH_OPTIONS.includes(requestedMonths)
    ? requestedMonths
    : (availableOptions[availableOptions.length - 1] ?? MONTH_OPTIONS[0]);

  const months = allMonths.slice(MAX_MONTHS - monthsCount);
  const fromISO = toISODate(new Date(months[0].year, months[0].month, 1, 12));
  const allExpenses = widestExpenses.filter((e) => e.date >= fromISO);

  const expenses = tagFilter ? allExpenses.filter((e) => e.tag_id === tagFilter) : allExpenses;
  const activeTagName = tagFilter ? tags.find((t) => t.id === tagFilter)?.name : null;

  const totalsByMonth = new Map<string, number>();
  for (const m of months) totalsByMonth.set(monthKey(m.year, m.month), 0);
  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    if (totalsByMonth.has(key)) {
      totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + Number(e.amount));
    }
  }

  const bars: Bar[] = months.map((m, i) => ({
    name: formatMonthShort(m.year, m.month),
    value: totalsByMonth.get(monthKey(m.year, m.month)) ?? 0,
    tone: i === months.length - 1 ? "primary" : "accent",
  }));

  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const currentTotal = totalsByMonth.get(monthKey(current.year, current.month)) ?? 0;
  const previousTotal = previous ? (totalsByMonth.get(monthKey(previous.year, previous.month)) ?? 0) : 0;
  const change =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : currentTotal > 0
        ? 100
        : 0;

  const currentMonthExpenses = expenses.filter(
    (e) => e.date.slice(0, 7) === monthKey(current.year, current.month),
  );
  const byCategory = new Map<string, number>();
  for (const e of currentMonthExpenses) {
    const name = (e.tag_id && tags.find((t) => t.id === e.tag_id)?.name) || "General";
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(e.amount));
  }
  const donutData = Array.from(byCategory, ([name, value]) => ({ name, value }));
  const topCategory =
    donutData.length > 0 ? donutData.reduce((a, b) => (b.value > a.value ? b : a)) : null;

  const hrefFor = (opts: { months?: number; tag?: string }) => {
    const params = new URLSearchParams();
    params.set("months", String(opts.months ?? monthsCount));
    if (opts.tag) params.set("tag", opts.tag);
    return `/reportes?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle={activeTagName ? `Filtrado por “${activeTagName}”` : `Comparativo de los últimos ${monthsCount} meses`}
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="glass inline-flex gap-1 rounded-2xl p-1">
          {MONTH_OPTIONS.map((m) => {
            const active = m === monthsCount;
            const disabled = !active && !availableOptions.includes(m);
            return disabled ? (
              <span
                key={m}
                aria-disabled="true"
                title={`Aún no tienes ${m} meses de historial`}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-muted/40 cursor-not-allowed"
              >
                {m}M
              </span>
            ) : (
              <Link
                key={m}
                href={hrefFor({ months: m, tag: tagFilter })}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
                  active ? "bg-primary text-white" : "text-muted",
                )}
              >
                {m}M
              </Link>
            );
          })}
        </div>

        {tags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="glass inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold text-ink cursor-pointer">
              <Icon name="chevronDown" size={14} />
              {activeTagName ?? "Todas las etiquetas"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href={hrefFor({ months: monthsCount })}>Todas las etiquetas</Link>
              </DropdownMenuItem>
              {tags.map((t) => (
                <DropdownMenuItem key={t.id} asChild>
                  <Link href={hrefFor({ months: monthsCount, tag: t.id })}>{t.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon="chart"
          title="Aún no hay datos"
          message="Registra gastos en Presupuesto para ver reportes comparativos de tus últimos meses."
          action={
            <Link
              href="/presupuesto"
              className="inline-flex items-center justify-center gap-2 rounded-full font-semibold min-h-11 px-4 text-[0.95rem] bg-gradient-brand text-white shadow-sm hover:brightness-[0.97] active:brightness-95"
            >
              <Icon name="plus" size={18} />
              Registrar gasto
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatTile
              label="Gasto este mes"
              value={<Money value={currentTotal} decimals={false} />}
              icon="wallet"
              tone="neutral"
            />
            <StatTile
              label="Cambio vs mes anterior"
              value={`${change >= 0 ? "+" : ""}${Math.round(change)}%`}
              sub={`Antes: ${formatDOP(previousTotal, false)}`}
              icon={change > 0 ? "trendUp" : "trendDown"}
              tone={change > 0 ? "danger" : "primary"}
            />
            {topCategory && (
              <StatTile
                className="col-span-2"
                label="Categoría más costosa del mes"
                value={topCategory.name}
                sub={formatDOP(topCategory.value, false)}
                icon="chart"
                tone="info"
              />
            )}
          </div>

          <GlassCard className="mb-4">
            <h2 className="font-bold text-ink mb-3">Gasto total por mes</h2>
            <BarCompare bars={bars} />
          </GlassCard>

          {donutData.length > 0 && (
            <GlassCard>
              <h2 className="font-bold text-ink mb-3">Distribución de este mes</h2>
              <DonutChart data={donutData} centerLabel="Este mes" />
            </GlassCard>
          )}
        </>
      )}
    </>
  );
}
