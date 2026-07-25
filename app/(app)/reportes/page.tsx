import Link from "next/link";
import { getExpenses, getSalaries, getTags } from "@/lib/data";
import { formatDateLong, formatDOP, formatMonthShort, todayISO, toISODate } from "@/lib/format";
import { monthPeriods } from "@/lib/periods";
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
import { ExportPdfButton } from "./ExportPdfButton";

export const metadata = { title: "Reportes · Cachin'" };

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const HISTORY_OPTIONS = [3, 6, 12];
const MAX_MONTHS = 12;
type ReportMode = "mes" | "quincena";

interface ReportPeriod {
  key: string;
  barLabel: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/** Un período por mes ("mes") o dos por mes -las quincenas ya calculadas en
 *  lib/periods.ts- ("quincena"). Ambos modos comparten la misma forma
 *  {key, barLabel, start, end}: el resto de la página agrega/filtra por
 *  rango de fechas sin ramificar por modo. */
function buildPeriods(mode: ReportMode, months: { year: number; month: number }[]): ReportPeriod[] {
  if (mode === "quincena") {
    return months.flatMap(({ year, month }) =>
      monthPeriods(year, month).map((p) => ({
        key: p.key,
        barLabel: `${p.half === 1 ? "1-15" : "16+"} ${formatMonthShort(year, month)}`,
        start: p.start,
        end: p.end,
      })),
    );
  }
  return months.map(({ year, month }) => ({
    key: monthKey(year, month),
    barLabel: formatMonthShort(year, month),
    start: toISODate(new Date(year, month, 1, 12)),
    end: toISODate(new Date(year, month + 1, 0, 12)),
  }));
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string; tag?: string; modo?: string }>;
}) {
  const sp = await searchParams;
  const tagFilter = sp.tag || "";
  const mode: ReportMode = sp.modo === "quincena" ? "quincena" : "mes";

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

  const [widestExpenses, widestSalaries, tags] = await Promise.all([
    getExpenses(widestFromISO, today),
    getSalaries(widestFromISO, today),
    getTags(),
  ]);

  const earliestDate = widestExpenses.reduce<string | null>(
    (min, e) => (min === null || e.date < min ? e.date : min),
    null,
  );
  const monthsOfHistory = earliestDate
    ? (ty - Number(earliestDate.slice(0, 4))) * 12 + (tm - Number(earliestDate.slice(5, 7))) + 1
    : 0;
  const availableOptions = HISTORY_OPTIONS.filter((m) => monthsOfHistory === 0 || m <= monthsOfHistory);

  const requestedMonths = Number(sp.months);
  const monthsCount = HISTORY_OPTIONS.includes(requestedMonths)
    ? requestedMonths
    : (availableOptions[availableOptions.length - 1] ?? HISTORY_OPTIONS[0]);

  const months = allMonths.slice(MAX_MONTHS - monthsCount);
  const fromISO = toISODate(new Date(months[0].year, months[0].month, 1, 12));
  const allExpenses = widestExpenses.filter((e) => e.date >= fromISO);

  const expenses = tagFilter ? allExpenses.filter((e) => e.tag_id === tagFilter) : allExpenses;
  const activeTagName = tagFilter ? tags.find((t) => t.id === tagFilter)?.name : null;

  // El ingreso NO se filtra por etiqueta: el dropdown de arriba filtra
  // categorías de gasto, mezclarlo con ingresos confundiría qué significa
  // "Filtrado por X". Mismo criterio que el resto de la app: un sueldo sin
  // confirmar no cuenta como ingreso real todavía (ver lib/summary.ts).
  const salaries = widestSalaries.filter((s) => s.confirmed && s.pay_date >= fromISO);

  const periods = buildPeriods(mode, months);

  const totalsByPeriod = new Map<string, number>();
  const incomeByPeriod = new Map<string, number>();
  for (const p of periods) {
    totalsByPeriod.set(p.key, 0);
    incomeByPeriod.set(p.key, 0);
  }
  const periodFor = (date: string) => periods.find((p) => date >= p.start && date <= p.end);
  for (const e of expenses) {
    const p = periodFor(e.date);
    if (p) totalsByPeriod.set(p.key, (totalsByPeriod.get(p.key) ?? 0) + Number(e.amount));
  }
  for (const s of salaries) {
    const p = periodFor(s.pay_date);
    if (p) incomeByPeriod.set(p.key, (incomeByPeriod.get(p.key) ?? 0) + Number(s.amount));
  }

  const bars: Bar[] = periods.map((p, i) => ({
    name: p.barLabel,
    value: totalsByPeriod.get(p.key) ?? 0,
    tone: i === periods.length - 1 ? "primary" : "accent",
  }));

  const current = periods[periods.length - 1];
  const previous = periods[periods.length - 2];
  const currentTotal = totalsByPeriod.get(current.key) ?? 0;
  const previousTotal = previous ? (totalsByPeriod.get(previous.key) ?? 0) : 0;
  const change =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : currentTotal > 0
        ? 100
        : 0;

  const currentIncome = incomeByPeriod.get(current.key) ?? 0;
  const currentNet = currentIncome - currentTotal;
  const hasIncomeHistory = salaries.length > 0;
  // Períodos con ingreso vs gasto lado a lado. No se reutiliza BarCompare
  // acá: esa barra dibuja el ancho proporcional al valor, y un período en
  // déficit (neto negativo) rompería el ancho — el signo tiene que verse
  // explícito, no perderse detrás de un valor absoluto.
  const netByPeriod = periods.map((p) => {
    const income = incomeByPeriod.get(p.key) ?? 0;
    const expense = totalsByPeriod.get(p.key) ?? 0;
    return { name: p.barLabel, income, expense, net: income - expense };
  });
  const maxFlow = Math.max(1, ...netByPeriod.flatMap((p) => [p.income, p.expense]));

  const currentPeriodExpenses = expenses.filter((e) => e.date >= current.start && e.date <= current.end);
  const byCategory = new Map<string, number>();
  for (const e of currentPeriodExpenses) {
    const name = (e.tag_id && tags.find((t) => t.id === e.tag_id)?.name) || "General";
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(e.amount));
  }
  const donutData = Array.from(byCategory, ([name, value]) => ({ name, value }));
  const topCategory =
    donutData.length > 0 ? donutData.reduce((a, b) => (b.value > a.value ? b : a)) : null;

  const hrefFor = (opts: { months?: number; tag?: string; modo?: ReportMode }) => {
    const params = new URLSearchParams();
    params.set("months", String(opts.months ?? monthsCount));
    params.set("modo", opts.modo ?? mode);
    if (opts.tag) params.set("tag", opts.tag);
    return `/reportes?${params.toString()}`;
  };

  const periodNoun = mode === "mes" ? "meses" : "quincenas";

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle={
          activeTagName
            ? `Filtrado por “${activeTagName}”`
            : `Comparativo de las últimas ${periods.length} ${periodNoun}`
        }
        action={expenses.length > 0 ? <ExportPdfButton /> : undefined}
      />

      {/* Solo aparece al imprimir/exportar — en pantalla el título y el
          rango ya están en el PageHeader de arriba, que se oculta al
          imprimir junto con el resto de la navegación. */}
      <p className="hidden print:block text-xs text-muted mb-4">
        Cachin&apos; · Reporte generado el {formatDateLong(today)}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
        <div className="glass inline-flex gap-1 rounded-2xl p-1">
          {(["quincena", "mes"] as const).map((m) => (
            <Link
              key={m}
              href={hrefFor({ modo: m })}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors capitalize",
                mode === m ? "bg-primary text-white" : "text-muted",
              )}
            >
              {m}
            </Link>
          ))}
        </div>

        <div className="glass inline-flex gap-1 rounded-2xl p-1">
          {HISTORY_OPTIONS.map((m) => {
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
          illustration="data-reports"
          title="Aún no hay períodos para comparar"
          message="Registra gastos en Presupuesto para ver reportes comparativos de tus últimos períodos."
          action={
            <Link
              href="/presupuesto"
              className="inline-flex items-center justify-center gap-2 rounded-full font-semibold min-h-11 px-4 text-[1.05rem] bg-gradient-brand text-white shadow-sm hover:brightness-[0.97] active:brightness-95"
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
              label="Gasto en este período"
              value={<Money value={currentTotal} decimals={false} />}
              icon="wallet"
              tone="neutral"
            />
            <StatTile
              label="Cambio vs período anterior"
              value={`${change >= 0 ? "+" : ""}${Math.round(change)}%`}
              sub={`Antes: ${formatDOP(previousTotal, false)}`}
              icon={change > 0 ? "trendUp" : "trendDown"}
              tone={change > 0 ? "danger" : "primary"}
            />
            {hasIncomeHistory && (
              <>
                <StatTile
                  label="Ingreso en este período"
                  value={<Money value={currentIncome} decimals={false} />}
                  icon="arrowDownLeft"
                  tone="primary"
                />
                <StatTile
                  label="Neto en este período"
                  value={<Money value={currentNet} decimals={false} />}
                  sub={currentNet >= 0 ? "Ahorraste" : "Gastaste de más"}
                  icon={currentNet >= 0 ? "trendUp" : "trendDown"}
                  tone={currentNet >= 0 ? "primary" : "danger"}
                />
              </>
            )}
            {topCategory && (
              <StatTile
                className="col-span-2"
                label="Categoría más costosa del período"
                value={topCategory.name}
                sub={formatDOP(topCategory.value, false)}
                icon="chart"
                tone="info"
              />
            )}
          </div>

          <GlassCard className="mb-4 print:break-inside-avoid">
            <h2 className="font-bold text-ink mb-3">Gasto total por período</h2>
            <BarCompare bars={bars} />
          </GlassCard>

          {/* Ingresos vs gastos: solo si hay al menos un sueldo confirmado en
              la ventana — si nunca se ha usado Ingresos, esta sección se
              vería vacía sin explicar por qué. */}
          {hasIncomeHistory && (
            <GlassCard className="mb-4 print:break-inside-avoid">
              <h2 className="font-bold text-ink mb-1">Ingresos vs. gastos</h2>
              <p className="text-sm text-muted mb-3">
                Verde = te sobró dinero ese período · Rojo = gastaste más de lo que entró.
              </p>
              <div className="flex flex-col gap-4">
                {netByPeriod.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-ink capitalize">{p.name}</span>
                      <span
                        className={cn(
                          "text-sm font-bold tabular",
                          p.net >= 0 ? "text-primary" : "text-danger",
                        )}
                      >
                        {p.net >= 0 ? "+" : "−"}
                        {formatDOP(Math.abs(p.net), false)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <div
                        className="h-2.5 rounded-full bg-primary"
                        style={{ width: `${(p.income / maxFlow) * 100}%` }}
                        title={`Ingreso: ${formatDOP(p.income, false)}`}
                      />
                      <div
                        className="h-2.5 rounded-full bg-danger/70"
                        style={{ width: `${(p.expense / maxFlow) * 100}%` }}
                        title={`Gasto: ${formatDOP(p.expense, false)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/5 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary" /> Ingreso
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-danger/70" /> Gasto
                </span>
              </div>
            </GlassCard>
          )}

          {donutData.length > 0 && (
            <GlassCard className="print:break-inside-avoid">
              <h2 className="font-bold text-ink mb-3">Distribución de este período</h2>
              <DonutChart data={donutData} centerLabel="Este período" />
            </GlassCard>
          )}
        </>
      )}
    </>
  );
}
