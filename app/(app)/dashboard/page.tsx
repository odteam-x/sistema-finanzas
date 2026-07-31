import Link from "next/link";
import { getFinanceSummary } from "@/lib/summary";
import { getUserProfile } from "@/lib/data";
import { runSubscriptionCatchUp } from "@/lib/subscriptions";
import { runSalaryCatchUp } from "@/lib/salary";
import { formatDateShort, daysBetween, clampPct } from "@/lib/format";
import { HomeHero } from "@/components/ui/HomeHero";
import { PendingSalaryNotice } from "@/components/ui/PendingSalaryNotice";
import { Card } from "@/components/ui/Card";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { StatTile } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { IconBubble } from "@/components/ui/IconBubble";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { BarCompare } from "@/components/charts/BarCompare";
import { GoalsRing } from "@/components/charts/GoalsRing";
import { NotificationTrigger, type NotificationCandidate } from "@/components/NotificationTrigger";
import { cn } from "@/lib/cn";

export const metadata = { title: "Inicio · Cachin'" };

const alertTone: Record<string, string> = {
  warning: "text-warning",
  danger: "text-expense",
  info: "text-info",
  success: "text-income",
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

/** Encabezado de sección: separa por espacio, no por línea. */
function SectionHead({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 mb-2.5">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-primary-fg shrink-0">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  // getUserProfile() no depende de nada que el catch-up escriba (perfil de
  // usuario, no ledger) — corre en paralelo con él en vez de esperar a que
  // termine. getFinanceSummary() sí depende (lee gastos/sueldos/movimientos
  // recién insertados), así que ese va después, solo.
  const [, , profile] = await Promise.all([
    runSubscriptionCatchUp(),
    runSalaryCatchUp(),
    getUserProfile(),
  ]);
  const s = await getFinanceSummary();

  const budgetPct = clampPct(s.realQuincena, s.estQuincena || 1);
  const overBudget = s.realQuincena > s.estQuincena && s.estQuincena > 0;

  // Proporción real entre lo ahorrado y lo adeudado, sobre su propia suma —
  // no un porcentaje inventado. Con ambos en 0 no hay nada que proporcionar,
  // así que la barra se omite (undefined) en vez de mostrar un 0% falso.
  const patrimonioBase = s.totalSaved + s.generalSavings + s.outstandingDebt;
  const ahorradoPct = patrimonioBase > 0 ? ((s.totalSaved + s.generalSavings) / patrimonioBase) * 100 : undefined;
  const adeudadoPct = patrimonioBase > 0 ? (s.outstandingDebt / patrimonioBase) * 100 : undefined;

  // Recordatorios locales al abrir el Inicio (ver NotificationTrigger.tsx):
  // reusa las alertas ya calculadas (deuda por vencer, presupuesto excedido)
  // y agrega el caso de día de cobro, que no tiene alerta propia.
  const notifCandidates: NotificationCandidate[] = s.alerts
    .filter((a) => a.tone === "warning" || a.tone === "danger")
    .map((a) => ({ key: `${s.today}-${a.title}`, title: a.title, body: a.message }));
  if (s.daysToPay === 0) {
    notifCandidates.push({
      key: `${s.today}-cobro`,
      title: "Día de cobro",
      body: "Hoy te toca cobrar — no olvides confirmarlo cuando te llegue.",
    });
  }

  return (
    <>
      <NotificationTrigger candidates={notifCandidates} />

      <HomeHero
        accounts={s.accountBalances}
        rates={s.rates}
        displayName={profile?.display_name ?? undefined}
        periodLabel={s.quincena.label}
        alertCount={s.alerts.length}
      />

      {s.pendingSalary && <PendingSalaryNotice salary={s.pendingSalary} />}

      {/* Alertas: lo más accionable de la pantalla, justo debajo del hero. */}
      {s.alerts.length > 0 && (
        <section className="mb-6">
          <SectionHead title="Alertas" href="/sugerencias" linkLabel="Ver consejos" />
          <Card flush>
            {/* Cada fila enlaza a /sugerencias (mismo destino que "Ver
                consejos"): antes la flecha no existía y nada de la fila
                era tocable salvo el enlace de la cabecera — no había forma
                de saber que había más detalle esperando ahí. */}
            <ul className="divide-y divide-line">
              {s.alerts.slice(0, 3).map((a, i) => (
                <li key={i}>
                  <Link
                    href="/sugerencias"
                    className="flex items-start gap-2.5 px-4 py-3 first:pt-4 last:pb-4 hover:bg-surface-sunken active:bg-surface-sunken transition-colors"
                  >
                    <Icon
                      name={(a.tone === "info" ? "bulb" : a.tone === "success" ? "check" : "alert") as IconName}
                      size={18}
                      className={cn("mt-0.5 shrink-0", alertTone[a.tone])}
                    />
                    <p className="min-w-0 flex-1 text-sm text-ink">
                      <span className="font-semibold">{a.title}.</span>{" "}
                      <span className="text-muted">{a.message}</span>
                    </p>
                    <Icon name="chevronRight" size={16} className="mt-0.5 shrink-0 text-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Resumen 2x2 en `quiet`: son cuatro cifras de contexto, y al tamaño
          de monto grande competían de frente con el saldo del hero. */}
      <section className="mb-6">
        <SectionHead title="Tu situación" />
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile
            emphasis="quiet"
            label="Total ahorrado"
            value={<MoneyValue value={s.totalSaved + s.generalSavings} decimals={false} />}
            // Suma metas + ahorro general (sin meta asignada) — el anillo de
            // "Ahorros" más abajo solo muestra lo de metas, así que esta
            // cifra puede ser mayor a propósito, no es un error de cuadre.
            sub={s.generalSavings > 0 ? "Incluye ahorro sin meta asignada" : undefined}
            info={
              <InfoTooltip label="Total ahorrado">
                Suma el progreso de todas tus metas más el saldo de tus cuentas de ahorro que no
                están atadas a ninguna meta. El anillo de “Ahorros”, más abajo, solo cuenta la parte
                de las metas — por eso es menor.
              </InfoTooltip>
            }
            icon="piggy"
            tone="primary"
            progress={ahorradoPct}
          />
          <StatTile
            emphasis="quiet"
            label="Total adeudado"
            value={<MoneyValue value={s.outstandingDebt} decimals={false} />}
            icon="debt"
            tone={s.outstandingDebt > 0 ? "expense" : "neutral"}
            progress={adeudadoPct}
          />
          <StatTile
            emphasis="quiet"
            label="Próximo pago"
            value={formatDateShort(s.nextPay)}
            sub={s.daysToPay === 0 ? "hoy" : `en ${s.daysToPay} días`}
            icon="clock"
            tone="info"
          />
          <StatTile
            emphasis="quiet"
            label="Próxima deuda"
            value={s.nextDue ? formatDateShort(s.nextDue) : "—"}
            sub={s.nextDueName ? `${s.nextDueName} · ${dueSub(s.daysToDue)}` : dueSub(s.daysToDue)}
            icon="calendar"
            tone={s.daysToDue !== null && s.daysToDue < 0 ? "expense" : "warning"}
          />
        </div>
      </section>

      {/* Compromisos próximos: colapsado — el próximo pago y la próxima deuda
          ya están arriba; esto es el detalle completo (incluye
          suscripciones), no la primera lectura de la pantalla. */}
      {s.upcomingCommitments.length > 0 && (
        <section className="mb-6">
          <CollapsibleCard
            title="Compromisos próximos"
            summary={`${s.upcomingCommitments.length} pendientes · el más próximo: ${s.upcomingCommitments[0].name}`}
            action={
              <Link href="/calendario" className="text-sm font-semibold text-primary-fg">
                Calendario
              </Link>
            }
          >
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
                  <p className="text-sm font-bold text-ink tabular shrink-0">
                    <Money value={c.amount} decimals={false} />
                  </p>
                </li>
              ))}
            </ul>
          </CollapsibleCard>
        </section>
      )}

      <section className="mb-6">
        <SectionHead title="Últimos movimientos" href="/movimientos" linkLabel="Ver todos" />
        <Card>
          {s.recentMovements.length === 0 ? (
            <p className="text-sm text-muted">Aún no has registrado movimientos.</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {s.recentMovements.map((m) => {
                const isDep = m.kind === "deposito";
                return (
                  <li key={m.id} className="flex items-center gap-3">
                    <IconBubble
                      icon={isDep ? "arrowDownLeft" : "arrowUpRight"}
                      tone={isDep ? "income" : "expense"}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">
                        {m.note ?? (isDep ? "Ingreso" : "Gasto")}
                      </p>
                      <p className="text-xs text-muted">{formatDateShort(m.date)}</p>
                    </div>
                    {/* El monto es lo que se escanea en una lista de dinero:
                        a la derecha, en negrita y tabular, con el color que
                        dice la dirección sin tener que leer el signo. */}
                    <p
                      className={cn(
                        "text-sm font-bold tabular shrink-0",
                        isDep ? "text-income" : "text-expense",
                      )}
                    >
                      {isDep ? "+" : "−"}
                      <Money value={Number(m.amount)} />
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <section className="mb-6">
        <SectionHead title="Gastos de la quincena" href="/presupuesto" linkLabel="Ver" />
        <Card>
          <div className="mb-5">
            <div className="flex items-end justify-between gap-3 mb-2">
              <span className="text-sm text-muted">
                Gastado{" "}
                <span className={cn("font-bold tabular", overBudget ? "text-expense" : "text-ink")}>
                  <Money value={s.realQuincena} decimals={false} />
                </span>
              </span>
              <span className="text-sm text-muted">
                de{" "}
                <span className="font-bold text-ink tabular">
                  <Money value={s.estQuincena} decimals={false} />
                </span>
              </span>
            </div>
            <ProgressBar value={budgetPct} tone={overBudget ? "danger" : "primary"} />
          </div>
          <BarCompare
            bars={[
              { name: "Ingreso quincenal", value: s.ingresoQuincena, tone: "income" },
              { name: "Presupuesto gastos", value: s.estQuincena, tone: "accent" },
              { name: "Cuotas del periodo", value: s.cuotasPeriodo, tone: "warning" },
            ]}
          />
        </Card>
      </section>

      {s.goals.length > 0 && (
        <section className="mb-6">
          <SectionHead title="Ahorros" href="/metas" linkLabel="Ver todos" />
          <Card>
            {/* Solo lo aportado a metas — distinto del "Total ahorrado" de
                arriba, que además suma el ahorro general sin meta. */}
            <GoalsRing saved={s.totalSaved} target={s.totalTarget} />
            {s.generalSavings > 0 && (
              <p className="mt-3 text-xs text-muted text-center">
                Este anillo es solo lo asignado a metas — tienes además{" "}
                <Money value={s.generalSavings} decimals={false} /> en ahorro sin meta.
              </p>
            )}
          </Card>
        </section>
      )}
    </>
  );
}
