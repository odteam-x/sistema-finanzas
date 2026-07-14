import Link from "next/link";
import { getFinanceSummary } from "@/lib/summary";
import { getUserProfile } from "@/lib/data";
import { runSubscriptionCatchUp } from "@/lib/subscriptions";
import { formatDOP, formatDateShort, clampPct } from "@/lib/format";
import { GreetingHero } from "@/components/ui/GreetingHero";
import { QuickActions } from "@/components/ui/QuickActions";
import { BalanceHero } from "@/components/ui/BalanceHero";
import { MotivationCard } from "@/components/ui/MotivationCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/ProgressBar";
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
  await runSubscriptionCatchUp();
  const [s, profile] = await Promise.all([getFinanceSummary(), getUserProfile()]);

  const donutData =
    s.realQuincena > 0 ? s.realByCategory : s.estByCategory;
  const donutLabel = s.realQuincena > 0 ? "Gasto real" : "Estimado";

  const topGoals = s.goals.slice(0, 3);
  const budgetPct = clampPct(s.realQuincena, s.estQuincena || 1);

  return (
    <>
      <GreetingHero subtitle={`Quincena ${s.quincena.label}`} displayName={profile?.display_name ?? undefined} />
      <QuickActions />

      <BalanceHero
        saldoEstimado={s.saldoEstimado}
        saldoReal={s.saldoReal}
        ingresoQuincena={s.ingresoQuincena}
        estQuincena={s.estQuincena}
        realQuincena={s.realQuincena}
        cuotasPeriodo={s.cuotasPeriodo}
      />

      <MotivationCard topGoal={s.goals[0] ?? null} />

      {/* Tiles (tamaños mixtos: total ahorrado/adeudado a todo el ancho) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatTile
          className="col-span-2"
          label="Total ahorrado"
          value={<MoneyValue value={s.savingsTotal} decimals={false} />}
          icon="piggy"
          tone="primary"
        />
        <StatTile
          label="Próximo pago"
          value={formatDateShort(s.nextPay)}
          sub={s.daysToPay === 0 ? "hoy" : `en ${s.daysToPay} días`}
          icon="clock"
          tone="info"
        />
        <StatTile
          label="Próxima deuda"
          value={s.nextDue ? formatDateShort(s.nextDue) : "—"}
          sub={s.nextDueName ? `${s.nextDueName} · ${dueSub(s.daysToDue)}` : dueSub(s.daysToDue)}
          icon="debt"
          tone={s.daysToDue !== null && s.daysToDue < 0 ? "danger" : "warning"}
        />
        <StatTile
          className="col-span-2"
          label="Total adeudado"
          value={<MoneyValue value={s.outstandingDebt} decimals={false} />}
          icon="debt"
          tone={s.outstandingDebt > 0 ? "danger" : "neutral"}
        />
        <StatTile
          className="col-span-2"
          label="Patrimonio neto"
          value={<MoneyValue value={s.netWorth} decimals={false} />}
          sub="Es lo que tendrías si vendieras todo lo que posees y pagaras todas tus deudas hoy."
          icon="bank"
          tone={s.netWorth >= 0 ? "primary" : "danger"}
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
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink truncate min-w-0">{g.name}</span>
                    <span className="text-xs text-muted tabular shrink-0">{Math.round(pct)}%</span>
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
