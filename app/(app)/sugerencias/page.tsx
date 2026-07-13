import { getFinanceSummary } from "@/lib/summary";
import { TIPS } from "@/lib/tips";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconBubble } from "@/components/ui/IconBubble";
import type { IconName } from "@/components/ui/Icon";
import type { Alert } from "@/lib/summary";

export const metadata = { title: "Consejos · Bolsillo Seguro" };

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
  const s = await getFinanceSummary();

  return (
    <>
      <PageHeader
        title="Consejos"
        subtitle="Alertas según tus datos y tips de finanzas"
      />

      {/* Alertas personalizadas */}
      <h2 className="text-sm font-bold text-ink px-1 mb-2">Para ti ahora</h2>
      {s.alerts.length === 0 ? (
        <GlassCard className="mb-6 flex items-center gap-3">
          <IconBubble icon="check" tone="brand" />
          <p className="text-sm text-muted">
            Todo en orden por ahora. Sigue registrando tus datos para recibir
            alertas útiles.
          </p>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {s.alerts.map((a, i) => {
            const st = alertStyle[a.tone];
            return (
              <GlassCard key={i} className="flex items-start gap-3">
                <IconBubble icon={st.name} tone={st.tone} />
                <div>
                  <p className="font-bold text-ink text-sm">{a.title}</p>
                  <p className="text-sm text-muted mt-0.5">{a.message}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Tips generales */}
      <h2 className="text-sm font-bold text-ink px-1 mb-2">
        Tips de finanzas personales
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TIPS.map((t, i) => (
          <GlassCard key={i} className="flex gap-3">
            <IconBubble icon="bulb" tone="neutral" size="sm" />
            <div>
              <p className="font-bold text-ink text-sm">{t.title}</p>
              <p className="text-sm text-muted mt-0.5">{t.body}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <p className="text-xs text-muted text-center mt-6 px-4">
        Este contenido es educativo y general. No constituye asesoría de inversión
        personalizada.
      </p>
    </>
  );
}
