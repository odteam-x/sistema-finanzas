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
import { SectionHead } from "@/components/ui/SectionHead";
import { Card } from "@/components/ui/Card";
import { GroupedList, GroupedListRow } from "@/components/ui/GroupedList";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { ThemeButton } from "@/components/theme/ThemeButton";
import { NotificationToggle } from "@/components/NotificationToggle";
import { SecuritySettings } from "@/components/SecuritySettings";
import { isPersonalCodeConfigured } from "@/lib/personalCodeCrypto";
import { DisplayNameForm } from "./DisplayNameForm";
import { ExportCsvForm } from "./ExportCsvForm";
import { ExchangeRateForm } from "./ExchangeRateForm";
import { addTag, deleteTag, updateTag, addCategorizationRule, deleteCategorizationRule } from "./actions";
import { undoDelete } from "../undo-actions";
import { seedDefaultTagsIfEmpty } from "@/lib/tags";

export const metadata = { title: "Configuración · Cachin'" };

const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "perfil", label: "Perfil", icon: "settings" },
  { id: "etiquetas", label: "Etiquetas", icon: "budget" },
  { id: "reglas", label: "Reglas", icon: "sparkle" },
  { id: "tasas", label: "Tasas", icon: "bank" },
  { id: "seguridad", label: "Seguridad", icon: "lock" },
  { id: "preferencias", label: "Apariencia", icon: "palette" },
  { id: "datos", label: "Datos", icon: "download" },
];

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
      submitLabel="Agregar etiqueta"
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
      submitLabel="Agregar regla"
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

      {/* Índice en rejilla de tiles. Era la única pantalla sin cifra ni
          acción primaria: siete bloques apilados que había que recorrer
          scrolleando para saber qué contenían. Los tiles dicen de un vistazo
          qué hay y saltan a cada sección. */}
      <nav aria-label="Secciones" className="grid grid-cols-4 gap-x-2 gap-y-3 mb-7">
        {SECTIONS.filter((s) => s.id !== "tasas" || foreignCurrencies.length > 0).map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex flex-col items-center gap-1.5 group active:scale-[0.97] transition-transform"
          >
            <span className="grid place-items-center size-14 rounded-tile bg-tint-brand text-primary-fg group-hover:bg-primary-soft transition-colors">
              <Icon name={s.icon} size={24} />
            </span>
            <span className="text-xs font-semibold text-muted text-center leading-tight">
              {s.label}
            </span>
          </a>
        ))}
      </nav>

      <Card id="perfil" className="mb-6 scroll-mt-24">
        <h2 className="font-bold text-ink mb-3">Perfil</h2>
        <DisplayNameForm initialName={profile?.display_name ?? ""} />
      </Card>

      <SectionHead
        id="etiquetas"
        className="scroll-mt-24"
        title="Etiquetas"
        action={<NewTagForm triggerLabel="Nueva" trigger="link" triggerIcon="plus" />}
      />

      {tags.length === 0 ? (
        <EmptyState
          icon="budget"
          illustration="preferences"
          title="Sin etiquetas todavía"
          message="Crea etiquetas generales (Comida, Transporte, Ocio…) para categorizar tus ingresos y gastos, sin depender de las líneas del presupuesto."
          action={<NewTagForm triggerLabel="Crear etiqueta" />}
        />
      ) : (
        <GroupedList>
          {tags.map((t) => {
            const limit = t.monthly_limit != null ? Number(t.monthly_limit) : null;
            const spent = spentByTag.get(t.id) ?? 0;
            const pct = limit ? clampPct(spent, limit) : 0;
            const over = limit != null && spent > limit;
            return (
              /* La fila deja de ser tarjeta y pasa a ser fila: el bloque con
                 la barra de límite se apila debajo, así que la fila envuelve
                 en columna en vez de ir toda en línea. */
              <GroupedListRow key={t.id} className="flex-col items-stretch gap-0">
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
                      submitLabel="Guardar etiqueta"
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
                    <div className="mt-3 pt-3 border-t border-line">
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
              </GroupedListRow>
            );
          })}
        </GroupedList>
      )}

      {tags.length > 0 && (
        <>
          <SectionHead
            id="reglas"
            className="mt-6 scroll-mt-24"
            title="Reglas de categorización"
            subtitle="Categoriza gastos solos según su nota."
            action={<NewRuleForm tags={tags} triggerLabel="Nueva" trigger="link" triggerIcon="plus" />}
          />

          {rules.length === 0 ? (
            <EmptyState
              icon="budget"
              illustration="preferences"
              title="Sin reglas todavía"
              message='Ej.: "colmado" → Colmado. La próxima vez que un gasto tenga esa palabra en la nota, se categoriza solo (siempre editable).'
              action={<NewRuleForm tags={tags} triggerLabel="Crear regla" />}
            />
          ) : (
            <GroupedList className="mb-4">
              {rules.map((r) => (
                <GroupedListRow key={r.id}>
                  <IconBubble icon="budget" tone="neutral" />
                  <p className="min-w-0 flex-1 text-sm text-ink truncate">
                    Si la nota contiene <span className="font-semibold">“{r.keyword}”</span> → {tagName(r.tag_id)}
                  </p>
                  <DeleteButton
                    action={deleteCategorizationRule.bind(null, r.id)}
                    title="¿Eliminar regla?"
                    message="Los gastos ya registrados no cambian."
                  />
                </GroupedListRow>
              ))}
            </GroupedList>
          )}
        </>
      )}

      {foreignCurrencies.length > 0 && (
        <Card id="tasas" className="mt-6 mb-6 scroll-mt-24">
          <h2 className="font-bold text-ink mb-1">Tasas de cambio</h2>
          <p className="text-xs text-muted mb-3">
            RD no tiene un feed automático confiable — actualiza la tasa tú mismo cuando cambie.
          </p>
          <div className="flex flex-col gap-3">
            {foreignCurrencies.map((c) => (
              <ExchangeRateForm key={c} currency={c} rate={rateByCurrency.get(c)} />
            ))}
          </div>
        </Card>
      )}

      <Card id="seguridad" className="mt-6 mb-6 scroll-mt-24">
        <h2 className="font-bold text-ink mb-3">Seguridad</h2>
        <SecuritySettings
          hasCode={Boolean(profile?.personal_code)}
          codeActive={profile?.personal_code_active ?? false}
          configured={isPersonalCodeConfigured()}
        />
      </Card>

      <Card id="preferencias" className="mb-6 scroll-mt-24">
        <h2 className="font-bold text-ink mb-3">Preferencias</h2>
        <ThemeButton variant="settings" />
        <div className="mt-4">
          <NotificationToggle />
        </div>
      </Card>

      <Card id="datos" className="scroll-mt-24">
        <h2 className="font-bold text-ink mb-3">Datos</h2>
        <ExportCsvForm />
      </Card>
    </>
  );
}
