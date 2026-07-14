import { getBudgetCategories, getExpenses } from "@/lib/data";
import { formatDOP, formatMonthShort, todayISO, toISODate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarCompare, type Bar } from "@/components/charts/BarCompare";
import { DonutChart } from "@/components/charts/DonutChart";

export const metadata = { title: "Reportes · Bolsillo Seguro" };

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default async function ReportesPage() {
  const today = todayISO();
  const [ty, tm] = today.split("-").map(Number);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ty, tm - 1 - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const fromISO = toISODate(new Date(months[0].year, months[0].month, 1, 12));

  const [expenses, categories] = await Promise.all([
    getExpenses(fromISO, today),
    getBudgetCategories(),
  ]);

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
  const previousTotal = totalsByMonth.get(monthKey(previous.year, previous.month)) ?? 0;
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
    const name =
      (e.category_id && categories.find((c) => c.id === e.category_id)?.name) || "General";
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(e.amount));
  }
  const donutData = Array.from(byCategory, ([name, value]) => ({ name, value }));
  const topCategory =
    donutData.length > 0 ? donutData.reduce((a, b) => (b.value > a.value ? b : a)) : null;

  return (
    <>
      <PageHeader title="Reportes" subtitle="Comparativo de los últimos 6 meses" />

      {expenses.length === 0 ? (
        <EmptyState
          icon="chart"
          title="Sin datos suficientes"
          message="Registra gastos en Presupuesto para ver reportes comparativos de tus últimos meses."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatTile
              label="Gasto este mes"
              value={formatDOP(currentTotal, false)}
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
