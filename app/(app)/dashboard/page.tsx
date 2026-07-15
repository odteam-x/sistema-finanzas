import Link from "next/link";
import { getFinanceSummary } from "@/lib/summary";
import { getUserProfile } from "@/lib/data";
import { runSubscriptionCatchUp } from "@/lib/subscriptions";
import { formatDateShort, daysBetween, clampPct } from "@/lib/format";
import { GreetingHero } from "@/components/ui/GreetingHero";
import { AvailableHero } from "@/components/ui/AvailableHero";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { BarCompare } from "@/components/charts/BarCompare";
import { GoalsRing } from "@/components/charts/GoalsRing";
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

function commitmentSub(days: number): string {
  if (days < 0) return "vencido";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

export default async function DashboardPage() {
  await runSubscriptionCatchUp();
  const [s, profile] = await Promise.all([getFinanceSummary(), getUserProfile()]);

  const budgetPct = clampPct(s.realQuincena, s.estQuincena || 1);
  const daysLeft = Math.max(1, daysBetween(s.today, s.quincena.end) + 1);
  const perDay = s.saldoReal / daysLeft;

  return (
    <>
      <GreetingHero subtitle={`Quincena ${s.quincena.label}`} displayName={profile?.display_name ?? undefined} />

      <AvailableHero disponible={s.saldoReal} daysLeft={daysLeft} perDay={perDay} />

      {/* Resumen (2x2) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
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
      </div>

      {/* Compromisos próximos */}
      {s.upcomingCommitments.length > 0 && (
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink">Compromisos próximos</h2>
            <Link href="/calendario" className="text-sm font-semibold text-primary">
              Calendario
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {s.upcomingCommitments.map((c, i) => (
              <li key={i} className="flex items-center gap-3">
                <IconBubble
                  icon={c.kind === "debt" ? "debt" : "repeat"}
                  tone={c.kind === "debt" ? "warning" : "info"}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{c.name}</p>
                  <p className="text-xs text-muted">{commitmentSub(daysBetween(s.today, c.date))}</p>
                </div>
                <p className="text-sm font-semibold text-ink shrink-0">
                  <Money value={c.amount} decimals={false} />
                </p>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Últimos movimientos */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink">Últimos movimientos</h2>
          <Link href="/movimientos" className="text-sm font-semibold text-primary">
            Ver todos
          </Link>
        </div>
        {s.recentMovements.length === 0 ? (
          <p className="text-sm text-muted">Aún no has registrado movimientos.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {s.recentMovements.map((m) => {
              const isDep = m.kind === "deposito";
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <IconBubble
                    icon={isDep ? "arrowDownLeft" : "arrowUpRight"}
                    tone={isDep ? "neutral" : "danger"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">
                      {m.note ?? (isDep ? "Ingreso" : "Gasto")}
                    </p>
                    <p className="text-xs text-muted">{formatDateShort(m.date)}</p>
                  </div>
                  <p className="text-sm font-semibold text-ink shrink-0">
                    {isDep ? "+" : "−"}
                    <Money value={Number(m.amount)} />
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

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
              Gastado <span className="font-bold text-ink"><Money value={s.realQuincena} decimals={false} /></span>
            </span>
            <span className="text-sm text-muted">
              de <span className="font-bold text-ink"><Money value={s.estQuincena} decimals={false} /></span>
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

      {/* Metas */}
      {s.goals.length > 0 && (
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink">Metas</h2>
            <Link href="/metas" className="text-sm font-semibold text-primary">
              Ver todas
            </Link>
          </div>
          <GoalsRing saved={s.totalSaved} target={s.totalTarget} />
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
