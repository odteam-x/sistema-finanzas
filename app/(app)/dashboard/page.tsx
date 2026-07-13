import Link from "next/link";
import { getFinanceSummary } from "@/lib/summary";
import { formatDOP, formatDateShort, clampPct } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarCompare } from "@/components/charts/BarCompare";
import { cn } from "@/lib/cn";

export const metadata = { title: "Inicio · Bolsillo Seguro" };

const alertTone: Record<string, string> = {
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  success: "text-primary",
};

function dueSub(days: number | null): string {
  if (days === null) return "Sin deudas";
  if (days < 0) return "vencida";
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

export default async function DashboardPage() {
  const s = await getFinanceSummary();

  const donutData =
    s.realQuincena > 0 ? s.realByCategory : s.estByCategory;
  const donutLabel = s.realQuincena > 0 ? "Gasto real" : "Estimado";

  const topGoals = s.goals.slice(0, 3);
  const budgetPct = clampPct(s.realQuincena, s.estQuincena || 1);

  return (
    <>
      <PageHeader title="Resumen" subtitle={`Quincena ${s.quincena.label}`} />

      {/* Saldo estimado (con presupuesto) */}
      <GlassCard strong className="mb-3 overflow-hidden relative">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">
              Saldo estimado <span className="text-muted/70">(con presupuesto)</span>
            </p>
            <MoneyValue
              value={s.saldoEstimado}
              className={cn(
                "block text-3xl sm:text-4xl font-extrabold mt-1",
                s.saldoEstimado >= 0 ? "text-gradient-brand" : "text-danger",
              )}
            />
            <p className="text-xs text-muted mt-1">
              Ingreso {formatDOP(s.ingresoQuincena, false)} − presupuesto{" "}
              {formatDOP(s.estQuincena, false)} − cuotas{" "}
              {formatDOP(s.cuotasPeriodo, false)}
            </p>
          </div>
          <span className="grid place-items-center size-12 rounded-2xl icon-badge bg-gradient-brand shrink-0">
            <Icon name="wallet" size={26} />
          </span>
        </div>
      </GlassCard>

      {/* Balance real (sin presupuesto) */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">
              Balance real <span className="text-muted/70">(sin presupuesto)</span>
            </p>
            <MoneyValue
              value={s.saldoReal}
              className={cn(
                "block text-2xl sm:text-3xl font-extrabold mt-1",
                s.saldoReal >= 0 ? "text-primary" : "text-danger",
              )}
            />
            <p className="text-xs text-muted mt-1">
              Ingreso {formatDOP(s.ingresoQuincena, false)} − gastado real{" "}
              {formatDOP(s.realQuincena, false)} − cuotas{" "}
              {formatDOP(s.cuotasPeriodo, false)}
            </p>
          </div>
          <span className="grid place-items-center size-12 rounded-2xl icon-badge bg-gradient-brand shrink-0">
            <Icon name="trendUp" size={26} />
          </span>
        </div>
        <p className="text-[0.7rem] text-muted mt-3 pt-3 border-t border-black/5">
          El estimado descuenta tu presupuesto planeado; el balance real solo
          descuenta lo que de verdad has gastado y las cuotas del periodo.
        </p>
      </GlassCard>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatTile
          label="Próximo pago"
          value={formatDateShort(s.nextPay)}
          sub={s.daysToPay === 0 ? "hoy" : `en ${s.daysToPay} días`}
          icon="clock"
          tone="primary"
        />
        <StatTile
          label="Próxima deuda"
          value={s.nextDue ? formatDateShort(s.nextDue) : "—"}
          sub={s.nextDueName ? `${s.nextDueName} · ${dueSub(s.daysToDue)}` : dueSub(s.daysToDue)}
          icon="debt"
          tone={s.daysToDue !== null && s.daysToDue < 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Total ahorrado"
          value={<MoneyValue value={s.savingsTotal} decimals={false} />}
          icon="piggy"
          tone="primary"
        />
        <StatTile
          label="Total adeudado"
          value={<MoneyValue value={s.outstandingDebt} decimals={false} />}
          icon="debt"
          tone={s.outstandingDebt > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Presupuesto de la quincena */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink">Presupuesto de la quincena</h2>
          <Link href="/presupuesto" className="text-sm font-semibold text-primary">
            Ver
          </Link>
        </div>
        <div className="mb-4">
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-sm text-muted">
              Gastado <span className="font-bold text-ink tabular">{formatDOP(s.realQuincena, false)}</span>
            </span>
            <span className="text-sm text-muted">
              de <span className="font-bold text-ink tabular">{formatDOP(s.estQuincena, false)}</span>
            </span>
          </div>
          <ProgressBar
            value={budgetPct}
            tone={s.realQuincena > s.estQuincena && s.estQuincena > 0 ? "danger" : "primary"}
          />
        </div>
        <BarCompare
          bars={[
            { name: "Ingreso quincenal", value: s.ingresoQuincena, tone: "primary" },
            { name: "Presupuesto gastos", value: s.estQuincena, tone: "accent" },
            { name: "Cuotas del periodo", value: s.cuotasPeriodo, tone: "warning" },
          ]}
        />
      </GlassCard>

      {/* Distribución de gastos */}
      {donutData.length > 0 && (
        <GlassCard className="mb-4">
          <h2 className="font-bold text-ink mb-3">Distribución de gastos</h2>
          <DonutChart data={donutData} centerLabel={donutLabel} />
        </GlassCard>
      )}

      {/* Metas */}
      {topGoals.length > 0 && (
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink">Metas</h2>
            <Link href="/metas" className="text-sm font-semibold text-primary">
              Ver todas
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {topGoals.map((g) => {
              const pct = clampPct(Number(g.current_amount), Number(g.target_amount));
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-ink truncate">{g.name}</span>
                    <span className="text-xs text-muted tabular">{Math.round(pct)}%</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Alertas */}
      {s.alerts.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-ink">Alertas</h2>
            <Link href="/sugerencias" className="text-sm font-semibold text-primary">
              Ver consejos
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {s.alerts.slice(0, 3).map((a, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Icon
                  name={(a.tone === "info" ? "bulb" : a.tone === "success" ? "check" : "alert") as IconName}
                  size={18}
                  className={cn("mt-0.5 shrink-0", alertTone[a.tone])}
                />
                <p className="text-sm text-ink">
                  <span className="font-semibold">{a.title}.</span>{" "}
                  <span className="text-muted">{a.message}</span>
                </p>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </>
  );
}
