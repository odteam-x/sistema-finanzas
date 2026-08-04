import Link from "next/link";
import { getExpenses, getSalaries, getTags } from "@/lib/data";
import { formatDateLong, formatDOP, formatMonthShort, todayISO, toISODate } from "@/lib/format";
import { monthPeriods } from "@/lib/periods";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { FilterMenu } from "@/components/ui/FilterMenu";
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

      {/* Filtros. Antes eran dos filas de píldoras RELLENAS (la activa en
          teal sólido, con el mismo peso que un botón de acción) más un
          dropdown de otro tamaño: tres controles compitiendo entre sí y con
          la acción primaria. Ahora los tres son el mismo selector
          secundario, y el valor activo se lee dentro del disparador. */}
      <div className="flex flex-wrap items-center gap-2 mb-6 print:hidden">
        <FilterMenu
          label="Periodo"
          value={mode === "mes" ? "Mes" : "Quincena"}
          options={[
            { label: "Quincena", href: hrefFor({ modo: "quincena" }), active: mode === "quincena" },
            { label: "Mes", href: hrefFor({ modo: "mes" }), active: mode === "mes" },
          ]}
        />
        <FilterMenu
          label="Historial"
          value={`${monthsCount} meses`}
          options={HISTORY_OPTIONS.map((m) => ({
            label: `${m} meses`,
            href: hrefFor({ months: m, tag: tagFilter }),
            active: m === monthsCount,
            disabled: m !== monthsCount && !availableOptions.includes(m),
            disabledReason: `Aún no tienes ${m} meses de historial`,
          }))}
        />
        {tags.length > 0 && (
          <FilterMenu
            label="Etiqueta"
            value={activeTagName ?? "Todas"}
            options={[
              { label: "Todas las etiquetas", href: hrefFor({ months: monthsCount }), active: !tagFilter },
              ...tags.map((t) => ({
                label: t.name,
                href: hrefFor({ months: monthsCount, tag: t.id }),
                active: t.id === tagFilter,
              })),
            ]}
          />
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
              className={buttonClasses()}
            >
              <Icon name="plus" size={18} />
              Registrar gasto
            </Link>
          }
        />
      ) : (
        <>
          {/* LA cifra dominante de la pantalla. El kit pide un total arriba;
              en una pantalla de reportes ese total tiene que hablar del
              período que se está reportando, no del saldo de la billetera
              (que ya manda en Inicio y en Balance). Antes no había ninguna
              cifra dominante: cinco StatTile del mismo tamaño. */}
          <section className="mb-6 rounded-hero bg-gradient-brand px-5 py-6 shadow-hero print:shadow-none">
            <p className="text-sm font-medium text-on-brand-muted">
              {hasIncomeHistory ? "Neto del período" : "Gasto del período"}
            </p>
            <p className="money-hero font-extrabold text-on-brand tabular mt-0.5">
              {hasIncomeHistory ? (
                <>
                  {currentNet >= 0 ? "+" : "−"}
                  {formatDOP(Math.abs(currentNet), false)}
                </>
              ) : (
                formatDOP(currentTotal, false)
              )}
            </p>
            <p className="mt-1.5 text-xs text-on-brand-muted capitalize">
              {current.barLabel}
              {hasIncomeHistory && (
                <span className="normal-case">
                  {currentNet >= 0 ? " · te sobró dinero" : " · gastaste más de lo que entró"}
                </span>
              )}
            </p>
          </section>

          {/* Las dos tarjetas que sostienen esa cifra: de dónde salió.
              Flecha abajo = entra, flecha arriba = sale. */}
          {hasIncomeHistory && (
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <StatTile
                label="Ingreso"
                value={<Money value={currentIncome} decimals={false} />}
                icon="arrowDownLeft"
                tone="income"
              />
              <StatTile
                label="Gasto"
                value={<Money value={currentTotal} decimals={false} />}
                icon="arrowUpRight"
                tone="expense"
              />
            </div>
          )}

          {/* Contexto, en `quiet`: no compiten con las dos de arriba. */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {!hasIncomeHistory && (
              <StatTile
                emphasis="quiet"
                label="Gasto en este período"
                value={<Money value={currentTotal} decimals={false} />}
                icon="wallet"
                tone="neutral"
              />
            )}
            <StatTile
              emphasis="quiet"
              label="Cambio vs período anterior"
              value={`${change >= 0 ? "+" : ""}${Math.round(change)}%`}
              sub={`Antes: ${formatDOP(previousTotal, false)}`}
              icon={change > 0 ? "trendUp" : "trendDown"}
              tone={change > 0 ? "expense" : "income"}
            />
            {topCategory && (
              <StatTile
                emphasis="quiet"
                className={hasIncomeHistory ? undefined : "col-span-2"}
                label="Categoría más costosa"
                value={topCategory.name}
                sub={formatDOP(topCategory.value, false)}
                icon="chart"
                tone="info"
              />
            )}
          </div>

          <section className="mb-6 print:break-inside-avoid">
            <h2 className="text-sm font-bold text-ink px-1 mb-2.5">Gasto total por período</h2>
            <Card>
              <BarCompare bars={bars} />
            </Card>
          </section>

          {/* Ingresos vs gastos: solo si hay al menos un sueldo confirmado en
              la ventana — si nunca se ha usado Ingresos, esta sección se
              vería vacía sin explicar por qué. */}
          {/* Ingresos vs gastos: solo si hay al menos un sueldo confirmado en
              la ventana — si nunca se ha usado Ingresos, esta sección se
              vería vacía sin explicar por qué. */}
          {hasIncomeHistory && (
            <section className="mb-6 print:break-inside-avoid">
              <h2 className="text-sm font-bold text-ink px-1 mb-2.5">Ingresos vs. gastos</h2>
              <Card>
                {/* Leyenda arriba y separada por espacio, no por una línea
                    debajo del gráfico: se lee ANTES de mirar las barras, que
                    es cuando hace falta. */}
                <div className="flex items-center gap-4 mb-5 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-pill bg-income" /> Ingreso
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-pill bg-expense" /> Gasto
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {netByPeriod.map((p) => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-sm text-muted capitalize min-w-0 truncate">{p.name}</span>
                        <span
                          className={cn(
                            "text-sm font-bold tabular shrink-0",
                            p.net >= 0 ? "text-income" : "text-expense",
                          )}
                        >
                          {p.net >= 0 ? "+" : "−"}
                          {formatDOP(Math.abs(p.net), false)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="h-2.5 rounded-pill bg-income"
                          style={{ width: `${(p.income / maxFlow) * 100}%` }}
                          title={`Ingreso: ${formatDOP(p.income, false)}`}
                        />
                        <div
                          className="h-2.5 rounded-pill bg-expense"
                          style={{ width: `${(p.expense / maxFlow) * 100}%` }}
                          title={`Gasto: ${formatDOP(p.expense, false)}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {donutData.length > 0 && (
            <section className="print:break-inside-avoid">
              <h2 className="text-sm font-bold text-ink px-1 mb-2.5">Distribución de este período</h2>
              <Card>
                <DonutChart data={donutData} centerLabel="Este período" />
              </Card>
            </section>
          )}
        </>
      )}
    </>
  );
}
