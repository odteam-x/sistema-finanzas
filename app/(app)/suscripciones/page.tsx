import { getSavingsAccounts, getSubscriptions, getTags } from "@/lib/data";
import { runSubscriptionCatchUp } from "@/lib/subscriptions";
import { formatDateShort, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { IconBubble } from "@/components/ui/IconBubble";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { Money } from "@/components/ui/Money";
import { addSubscription, deleteSubscription, updateSubscription } from "./actions";
import type { SavingsAccount, Tag } from "@/lib/types";

export const metadata = { title: "Suscripciones · Cachin'" };

function NewSubscriptionForm({
  tags,
  accounts,
  today,
  triggerLabel,
}: {
  tags: Tag[];
  accounts: SavingsAccount[];
  today: string;
  triggerLabel: string;
}) {
  return (
    <FormModal title="Nueva suscripción" action={addSubscription} submitLabel="Agregar" triggerLabel={triggerLabel}>
      <Field label="Nombre" htmlFor="name" required>
        <Input id="name" name="name" placeholder="Netflix, Gimnasio…" required />
      </Field>
      <Field label="Monto" htmlFor="amount" required>
        <MoneyInput id="amount" name="amount" required />
      </Field>
      <Field label="Frecuencia" htmlFor="frequency">
        <Select id="frequency" name="frequency" defaultValue="mensual">
          <option value="mensual">Mensual</option>
          <option value="anual">Anual</option>
        </Select>
      </Field>
      <Field label="Próximo cobro" htmlFor="next_charge_date" required>
        <Input id="next_charge_date" name="next_charge_date" type="date" defaultValue={today} required />
      </Field>
      {tags.length > 0 && (
        <Field label="Categoría" htmlFor="tag_id" hint="Opcional.">
          <Select id="tag_id" name="tag_id" defaultValue="">
            <option value="">General</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {accounts.length > 0 && (
        <Field label="Cuenta" htmlFor="account_id" hint="Opcional: resta el monto al cobrarse.">
          <Select id="account_id" name="account_id" defaultValue="">
            <option value="">Sin asociar</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </FormModal>
  );
}

export default async function SuscripcionesPage() {
  await runSubscriptionCatchUp();

  const today = todayISO();
  const [subs, tags, accounts] = await Promise.all([
    getSubscriptions(),
    getTags(),
    getSavingsAccounts(),
  ]);

  const active = subs.filter((s) => s.active);
  const monthlyEquivalent = active.reduce(
    (sum, s) => sum + (s.frequency === "anual" ? Number(s.amount) / 12 : Number(s.amount)),
    0,
  );

  return (
    <>
      <PageHeader
        title="Suscripciones"
        subtitle="Cobros recurrentes"
        action={<NewSubscriptionForm tags={tags} accounts={accounts} today={today} triggerLabel="Nueva" />}
      />

      <div className="mb-4">
        <StatTile
          label="Costo mensual equivalente"
          value={<MoneyValue value={monthlyEquivalent} decimals={false} />}
          sub={`${active.length} ${active.length === 1 ? "suscripción activa" : "suscripciones activas"}`}
          icon="repeat"
          tone="primary"
        />
      </div>

      {subs.length === 0 ? (
        <EmptyState
          icon="repeat"
          title="Sin suscripciones"
          message="Añade un cobro recurrente y lo generamos solo cada mes."
          action={<NewSubscriptionForm tags={tags} accounts={accounts} today={today} triggerLabel="Añadir suscripción" />}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {subs.map((s) => (
            <li key={s.id}>
              <GlassCard className={`flex items-center gap-3 py-3 ${s.active ? "" : "opacity-60"}`}>
                <IconBubble icon="repeat" tone={s.active ? "brand" : "neutral"} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink truncate">{s.name}</p>
                  <p className="text-sm text-ink font-semibold">
                    <Money value={Number(s.amount)} />
                  </p>
                  <p className="text-xs text-muted">
                    Próximo cobro: {formatDateShort(s.next_charge_date)}
                  </p>
                </div>
                <Badge tone={s.frequency === "anual" ? "info" : "neutral"}>
                  {s.frequency === "anual" ? "Anual" : "Mensual"}
                </Badge>
                <FormModal
                  title="Editar suscripción"
                  action={updateSubscription}
                  submitLabel="Guardar"
                  trigger="icon"
                  triggerIcon="edit"
                  triggerAriaLabel={`Editar ${s.name}`}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <Field label="Nombre" htmlFor={`n-${s.id}`} required>
                    <Input id={`n-${s.id}`} name="name" defaultValue={s.name} required />
                  </Field>
                  <Field label="Monto" htmlFor={`a-${s.id}`} required>
                    <MoneyInput id={`a-${s.id}`} name="amount" defaultValue={String(s.amount)} required />
                  </Field>
                  <Field label="Frecuencia" htmlFor={`f-${s.id}`}>
                    <Select id={`f-${s.id}`} name="frequency" defaultValue={s.frequency}>
                      <option value="mensual">Mensual</option>
                      <option value="anual">Anual</option>
                    </Select>
                  </Field>
                  <Field label="Próximo cobro" htmlFor={`d-${s.id}`} required>
                    <Input
                      id={`d-${s.id}`}
                      name="next_charge_date"
                      type="date"
                      defaultValue={s.next_charge_date}
                      required
                    />
                  </Field>
                  {tags.length > 0 && (
                    <Field label="Categoría" htmlFor={`c-${s.id}`}>
                      <Select id={`c-${s.id}`} name="tag_id" defaultValue={s.tag_id ?? ""}>
                        <option value="">General</option>
                        {tags.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  {accounts.length > 0 && (
                    <Field label="Cuenta" htmlFor={`acc-${s.id}`}>
                      <Select id={`acc-${s.id}`} name="account_id" defaultValue={s.account_id ?? ""}>
                        <option value="">Sin asociar</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </FormModal>
                <DeleteButton
                  action={deleteSubscription.bind(null, s.id)}
                  title="¿Eliminar suscripción?"
                  message="Ya no se generarán gastos automáticos por este cobro."
                />
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
