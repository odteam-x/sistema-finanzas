import { getExpenses, getTags, getUserProfile } from "@/lib/data";
import { todayISO, toISODate, clampPct } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Money } from "@/components/ui/Money";
import { ThemeButton } from "@/components/theme/ThemeButton";
import { DisplayNameForm } from "./DisplayNameForm";
import { ExportCsvForm } from "./ExportCsvForm";
import { addTag, deleteTag, updateTag } from "./actions";

export const metadata = { title: "Configuración · Bolsillo Seguro" };

function NewTagForm({
  triggerLabel,
  trigger,
  triggerIcon,
}: {
  triggerLabel: string;
  trigger?: "button" | "link" | "icon" | "pill";
  triggerIcon?: "plus";
}) {
  return (
    <FormModal
      title="Nueva etiqueta"
      action={addTag}
      submitLabel="Agregar"
      trigger={trigger}
      triggerIcon={triggerIcon}
      triggerLabel={triggerLabel}
    >
      <Field label="Nombre" htmlFor="tag-name" required hint="Ej.: Comida, Transporte, Ocio, Salud">
        <Input id="tag-name" name="name" placeholder="Comida" required />
      </Field>
      <Field
        label="Límite mensual"
        htmlFor="tag-limit"
        hint="Opcional. Si te pasas, lo verás en ámbar/rojo aquí."
      >
        <MoneyInput id="tag-limit" name="monthly_limit" />
      </Field>
    </FormModal>
  );
}

export default async function ConfiguracionPage() {
  const today = todayISO();
  const monthStart = toISODate(new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1, 12));

  const [profile, tags, monthExpenses] = await Promise.all([
    getUserProfile(),
    getTags(),
    getExpenses(monthStart, today),
  ]);

  const spentByTag = new Map<string, number>();
  for (const e of monthExpenses) {
    if (!e.tag_id) continue;
    spentByTag.set(e.tag_id, (spentByTag.get(e.tag_id) ?? 0) + Number(e.amount));
  }

  return (
    <>
      <PageHeader title="Configuración" subtitle="Perfil, etiquetas, apariencia y datos" />

      <GlassCard className="mb-4">
        <h2 className="font-bold text-ink mb-3">Perfil</h2>
        <DisplayNameForm initialName={profile?.display_name ?? ""} />
      </GlassCard>

      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-bold text-ink">Etiquetas</h2>
        <NewTagForm triggerLabel="Nueva" trigger="link" triggerIcon="plus" />
      </div>

      {tags.length === 0 ? (
        <EmptyState
          icon="budget"
          title="Sin etiquetas todavía"
          message="Crea etiquetas generales (Comida, Transporte, Ocio…) para categorizar tus ingresos y gastos, sin depender de las líneas del presupuesto."
          action={<NewTagForm triggerLabel="Crear etiqueta" />}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {tags.map((t) => {
            const limit = t.monthly_limit != null ? Number(t.monthly_limit) : null;
            const spent = spentByTag.get(t.id) ?? 0;
            const pct = limit ? clampPct(spent, limit) : 0;
            const over = limit != null && spent > limit;
            return (
              <li key={t.id}>
                <GlassCard className="py-3">
                  <div className="flex items-center gap-3">
                    <IconBubble icon="budget" tone="neutral" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink truncate">{t.name}</p>
                      {limit != null && (
                        <p className="text-xs text-muted">
                          Límite <Money value={limit} decimals={false} />/mes
                        </p>
                      )}
                    </div>
                    <FormModal
                      title="Editar etiqueta"
                      action={updateTag}
                      submitLabel="Guardar"
                      trigger="icon"
                      triggerIcon="edit"
                      triggerAriaLabel={`Editar ${t.name}`}
                    >
                      <input type="hidden" name="id" value={t.id} />
                      <Field label="Nombre" htmlFor={`tn-${t.id}`} required>
                        <Input id={`tn-${t.id}`} name="name" defaultValue={t.name} required />
                      </Field>
                      <Field label="Límite mensual" htmlFor={`tl-${t.id}`} hint="Opcional. Vacío = sin límite.">
                        <MoneyInput
                          id={`tl-${t.id}`}
                          name="monthly_limit"
                          defaultValue={limit != null ? String(limit) : ""}
                        />
                      </Field>
                    </FormModal>
                    <DeleteButton
                      action={deleteTag.bind(null, t.id)}
                      title="¿Eliminar etiqueta?"
                      message="Los ingresos/gastos que la usaban quedarán sin etiqueta."
                    />
                  </div>

                  {limit != null && (
                    <div className="mt-3 pt-3 border-t border-black/5">
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="text-muted">
                          Este mes: <span className="font-bold text-ink"><Money value={spent} decimals={false} /></span>
                        </span>
                        <span className="text-muted">
                          Límite <span className="font-bold text-ink"><Money value={limit} decimals={false} /></span>
                        </span>
                      </div>
                      <ProgressBar value={pct} tone={over ? "danger" : pct >= 80 ? "warning" : "primary"} />
                    </div>
                  )}
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}

      <GlassCard className="mt-4 mb-4">
        <h2 className="font-bold text-ink mb-3">Preferencias</h2>
        <ThemeButton variant="settings" />
      </GlassCard>

      <GlassCard>
        <h2 className="font-bold text-ink mb-3">Datos</h2>
        <ExportCsvForm />
      </GlassCard>
    </>
  );
}
