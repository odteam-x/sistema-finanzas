import { getFinanceSummary } from "@/lib/summary";
import { TIPS } from "@/lib/tips";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Alert } from "@/lib/summary";

export const metadata = { title: "Consejos · Finanzas" };

const alertStyle: Record<
  Alert["tone"],
  { wrap: string; icon: string; name: IconName }
> = {
  warning: {
    wrap: "bg-warning-soft",
    icon: "text-warning",
    name: "alert",
  },
  danger: { wrap: "bg-danger-soft", icon: "text-danger", name: "alert" },
  info: { wrap: "bg-[#e2ecf7]", icon: "text-info", name: "bulb" },
  success: {
    wrap: "bg-primary-soft",
    icon: "text-primary",
    name: "check",
  },
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
          <span className="grid place-items-center size-10 rounded-full bg-primary-soft text-primary shrink-0">
            <Icon name="check" size={20} />
          </span>
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
                <span
                  className={cn(
                    "grid place-items-center size-10 rounded-full shrink-0",
                    st.wrap,
                    st.icon,
                  )}
                >
                  <Icon name={st.name} size={20} />
                </span>
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
            <span className="grid place-items-center size-9 rounded-full bg-primary-soft text-primary shrink-0">
              <Icon name="bulb" size={18} />
            </span>
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
