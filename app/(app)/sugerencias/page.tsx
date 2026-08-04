import { getFinanceSummary } from "@/lib/summary";
import { getSavingsAccounts, getTags } from "@/lib/data";
import { todayISO } from "@/lib/format";
import type { TipSituation } from "@/lib/tips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { IconBubble } from "@/components/ui/IconBubble";
import { Money } from "@/components/ui/Money";
import { NewSubscriptionForm } from "../suscripciones/NewSubscriptionForm";
import { TipsList } from "./TipsList";
import type { IconName } from "@/components/ui/Icon";
import type { Alert } from "@/lib/summary";

export const metadata = { title: "Consejos · Cachin'" };

const alertStyle: Record<
  Alert["tone"],
  { tone: "warning" | "danger" | "info" | "brand"; name: IconName }
> = {
  warning: { tone: "warning", name: "alert" },
  danger: { tone: "danger", name: "alert" },
  info: { tone: "info", name: "bulb" },
  success: { tone: "brand", name: "check" },
};

export default async function SugerenciasPage() {
  const [s, accounts, tags] = await Promise.all([getFinanceSummary(), getSavingsAccounts(), getTags()]);
  const today = todayISO();

  // Qué le falta a esta persona, para que el consejo que le sirve hoy salga
  // primero en vez del orden fijo del archivo (ver lib/tips.ts).
  const situation: TipSituation = {
    hasDebt: s.outstandingDebt > 0,
    hasGoals: s.goals.length > 0,
    hasSavings: s.totalSaved + s.generalSavings > 0,
    hasBudget: s.estQuincena > 0,
    logsExpenses: s.realQuincena > 0,
    overBudget: s.estQuincena > 0 && s.realQuincena > s.estQuincena,
  };

  return (
    <>
      <PageHeader
        title="Consejos"
        subtitle="Alertas según tus datos y tips de finanzas"
      />

      {/* Suscripciones detectadas: gastos que se repiten con la misma nota y
          monto en 2+ meses pero no están dadas de alta como suscripción —
          regla simple sobre lib/summary.ts, no ML. Se ofrece "Dar de alta"
          con un solo tap; nunca se registra sola. */}
      {s.subscriptionCandidates.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-ink px-1 mb-2">Posibles suscripciones</h2>
          <div className="flex flex-col gap-2 mb-6">
            {s.subscriptionCandidates.map((c, i) => (
              <Card key={i} className="flex items-center gap-3">
                <IconBubble icon="repeat" tone="info" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink text-sm truncate">{c.name}</p>
                  <p className="text-sm text-muted">
                    <Money value={c.amount} decimals={false} /> · se repitió {c.occurrences} meses seguidos
                  </p>
                </div>
                <NewSubscriptionForm
                  tags={tags}
                  accounts={accounts}
                  today={today}
                  triggerLabel="Dar de alta"
                  trigger="link"
                  defaultName={c.name}
                  defaultAmount={c.amount}
                />
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Alertas personalizadas */}
      <h2 className="text-sm font-bold text-ink px-1 mb-2">Para ti ahora</h2>
      {s.alerts.length === 0 ? (
        <Card className="mb-6 flex items-center gap-3">
          <IconBubble icon="check" tone="brand" />
          <p className="text-sm text-muted">
            Todo en orden por ahora. Sigue registrando tus datos para recibir
            alertas útiles.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {s.alerts.map((a, i) => {
            const st = alertStyle[a.tone];
            return (
              <Card key={i} className="flex items-start gap-3">
                <IconBubble icon={st.name} tone={st.tone} />
                <div>
                  <p className="font-bold text-ink text-sm">{a.title}</p>
                  <p className="text-sm text-muted mt-0.5">{a.message}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tips generales: colapsados por defecto, no compiten con "Para ti
          ahora" (lo único que de verdad cambia según tus datos). */}
      <h2 className="text-sm font-bold text-ink px-1 mb-2">Aprender</h2>
      <TipsList situation={situation} />

      <p className="text-xs text-muted text-center mt-6 px-4">
        Este contenido es educativo y general. No constituye asesoría de inversión
        personalizada.
      </p>
    </>
  );
}
