import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { addSubscription } from "./actions";
import type { SavingsAccount, Tag } from "@/lib/types";

/** `defaultName`/`defaultAmount` existen para el flujo de "dar de alta" una
 *  suscripción sugerida desde Consejos (detección de cobros recurrentes,
 *  ver lib/summary.ts) — el resto de llamadores no los pasa. */
export function NewSubscriptionForm({
  tags,
  accounts,
  today,
  triggerLabel,
  trigger,
  defaultName,
  defaultAmount,
}: {
  tags: Tag[];
  accounts: SavingsAccount[];
  today: string;
  triggerLabel: string;
  trigger?: "button" | "link" | "icon" | "pill";
  defaultName?: string;
  defaultAmount?: number;
}) {
  return (
    <FormModal
      title="Nueva suscripción"
      action={addSubscription}
      submitLabel="Agregar"
      triggerLabel={triggerLabel}
      trigger={trigger}
    >
      <Field label="Nombre" htmlFor="name" required>
        <Input id="name" name="name" placeholder="Netflix, Gimnasio…" defaultValue={defaultName} required />
      </Field>
      <Field label="Monto" htmlFor="amount" required>
        <MoneyInput
          id="amount"
          name="amount"
          defaultValue={defaultAmount != null ? String(defaultAmount) : undefined}
          required
        />
      </Field>
      <Field label="Frecuencia" htmlFor="frequency">
        <Select id="frequency" name="frequency" defaultValue="mensual">
          <option value="mensual">Mensual</option>
          <option value="anual">Anual</option>
        </Select>
      </Field>
      <Field label="Próximo cobro" htmlFor="next_charge_date" required>
        <DateField id="next_charge_date" name="next_charge_date" defaultValue={today} required />
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
