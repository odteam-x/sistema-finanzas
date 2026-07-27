import {
  getCategorizationRules,
  getExchangeRates,
  getExpenses,
  getSavingsAccounts,
  getTags,
  getUserProfile,
} from "@/lib/data";
import { todayISO, toISODate, clampPct } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Money } from "@/components/ui/Money";
import { ThemeButton } from "@/components/theme/ThemeButton";
import { NotificationToggle } from "@/components/NotificationToggle";
import { SecuritySettings } from "@/components/SecuritySettings";
import { DisplayNameForm } from "./DisplayNameForm";
import { ExportCsvForm } from "./ExportCsvForm";
import { ExchangeRateForm } from "./ExchangeRateForm";
import { addTag, deleteTag, updateTag, addCategorizationRule, deleteCategorizationRule } from "./actions";
import { undoDelete } from "../undo-actions";
import { seedDefaultTagsIfEmpty } from "@/lib/tags";

export const metadata = { title: "Configuración · Cachin'" };

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

/** Regla simple de auto-categorización: "si la nota contiene esta palabra,
 *  usa esta categoría" — se aplica sola al registrar un gasto sin categoría
 *  elegida a mano (ver lib/categorize.ts). */
function NewRuleForm({
  tags,
  triggerLabel,
  trigger,
  triggerIcon,
}: {
  tags: { id: string; name: string }[];
  triggerLabel: string;
  trigger?: "button" | "link" | "icon" | "pill";
  triggerIcon?: "plus";
}) {
  return (
    <FormModal
      title="Nueva regla"
      action={addCategorizationRule}
      submitLabel="Agregar"
      trigger={trigger}
      triggerIcon={triggerIcon}
      triggerLabel={triggerLabel}
    >
      <Field
        label="Si la nota contiene…"
        htmlFor="rule-keyword"
        required
        hint="Ej.: colmado, uber, netflix. No distingue mayúsculas ni acentos."
      >
        <Input id="rule-keyword" name="keyword" placeholder="colmado" required />
      </Field>
      <Field label="…usa esta categoría" htmlFor="rule-tag" required>
        <Select id="rule-tag" name="tag_id" required>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
    </FormModal>
  );
}

export default async function ConfiguracionPage() {
  await seedDefaultTagsIfEmpty();
  const today = todayISO();
  const monthStart = toISODate(new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1, 12));

  const [profile, tags, monthExpenses, accounts, exchangeRates, rules] = await Promise.all([
    getUserProfile(),
    getTags(),
    getExpenses(monthStart, today),
    getSavingsAccounts(),
    getExchangeRates(),
    getCategorizationRules(),
  ]);

  const spentByTag = new Map<string, number>();
  for (const e of monthExpenses) {
    if (!e.tag_id) continue;
    spentByTag.set(e.tag_id, (spentByTag.get(e.tag_id) ?? 0) + Number(e.amount));
  }

  // Solo se ofrecen tasas de las monedas que el usuario realmente usa en
  // alguna cuenta — no tiene sentido pedir una tasa de una moneda sin cuentas.
  const foreignCurrencies = Array.from(
    new Set(accounts.map((a) => a.currency).filter((c): c is "USD" | "EUR" => c !== "DOP")),
  );
  const rateByCurrency = new Map(exchangeRates.map((r) => [r.currency, r]));
  const tagName = (id: string) => tags.find((t) => t.id === id)?.name ?? "—";

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
          illustration="preferences"
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
                        undoAction={undoDelete}
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

      {tags.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1 mb-2 mt-4">
            <div>
              <h2 className="text-sm font-bold text-ink">Reglas de categorización</h2>
              <p className="text-xs text-muted">Categoriza gastos solos según su nota.</p>
            </div>
            <NewRuleForm tags={tags} triggerLabel="Nueva" trigger="link" triggerIcon="plus" />
          </div>

          {rules.length === 0 ? (
            <EmptyState
              icon="budget"
              illustration="preferences"
              title="Sin reglas todavía"
              message='Ej.: "colmado" → Colmado. La próxima vez que un gasto tenga esa palabra en la nota, se categoriza solo (siempre editable).'
              action={<NewRuleForm tags={tags} triggerLabel="Crear regla" />}
            />
          ) : (
            <ul className="flex flex-col gap-2 mb-4">
              {rules.map((r) => (
                <li key={r.id}>
                  <GlassCard className="py-3 flex items-center gap-3">
                    <IconBubble icon="budget" tone="neutral" />
                    <p className="min-w-0 flex-1 text-sm text-ink truncate">
                      Si la nota contiene <span className="font-semibold">“{r.keyword}”</span> → {tagName(r.tag_id)}
                    </p>
                    <DeleteButton
                      action={deleteCategorizationRule.bind(null, r.id)}
                      title="¿Eliminar regla?"
                      message="Los gastos ya registrados no cambian."
                    />
                  </GlassCard>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {foreignCurrencies.length > 0 && (
        <GlassCard className="mt-4 mb-4">
          <h2 className="font-bold text-ink mb-1">Tasas de cambio</h2>
          <p className="text-xs text-muted mb-3">
            RD no tiene un feed automático confiable — actualiza la tasa tú mismo cuando cambie.
          </p>
          <div className="flex flex-col gap-3">
            {foreignCurrencies.map((c) => (
              <ExchangeRateForm key={c} currency={c} rate={rateByCurrency.get(c)} />
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="mt-4 mb-4">
        <h2 className="font-bold text-ink mb-3">Seguridad</h2>
        <SecuritySettings />
      </GlassCard>

      <GlassCard className="mt-4 mb-4">
        <h2 className="font-bold text-ink mb-3">Preferencias</h2>
        <ThemeButton variant="settings" />
        <div className="mt-3 pt-3 border-t border-black/5">
          <NotificationToggle />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-bold text-ink mb-3">Datos</h2>
        <ExportCsvForm />
      </GlassCard>
    </>
  );
}
