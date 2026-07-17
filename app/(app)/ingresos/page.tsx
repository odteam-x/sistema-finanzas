import Link from "next/link";
import { getSalaries, getSalarySettings, getSavingsAccounts, getTags } from "@/lib/data";
import { runSalaryCatchUp } from "@/lib/salary";
import {
  formatDateLong,
  formatDateShort,
  todayISO,
  daysBetween,
} from "@/lib/format";
import { nextPayDateFrom } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { Money } from "@/components/ui/Money";
import { addSalary, deleteSalary, saveSalarySettings } from "./actions";
import { ConfirmSalaryButton } from "@/components/ui/ConfirmSalaryButton";
import type { SavingsAccount, SalarySettings, Tag } from "@/lib/types";

export const metadata = { title: "Ingresos · Cachin'" };

const FREQ_LABEL: Record<string, string> = {
  semanal: "Semanal",
  quincenal: "Quincenal (cada 15 días)",
  mensual: "Mensual",
};

function NewSalaryForm({
  settings,
  tags,
  accounts,
  today,
  triggerLabel,
  trigger,
}: {
  settings: Omit<SalarySettings, "user_id">;
  tags: Tag[];
  accounts: SavingsAccount[];
  today: string;
  triggerLabel: string;
  trigger?: "button" | "link" | "icon" | "pill";
}) {
  return (
    <FormModal
      title="Registrar ingreso"
      action={addSalary}
      submitLabel="Registrar"
      triggerLabel={triggerLabel}
      trigger={trigger}
    >
      <Field label="Monto" htmlFor="amount" required>
        <MoneyInput
          id="amount"
          name="amount"
          defaultValue={settings.default_amount ? String(settings.default_amount) : ""}
          required
        />
      </Field>
      <Field label="Fecha" htmlFor="pay_date" required>
        <Input id="pay_date" name="pay_date" type="date" defaultValue={today} required />
      </Field>
      <Field label="Tipo" htmlFor="kind">
        <Select id="kind" name="kind" defaultValue="quincena">
          <option value="quincena">Sueldo</option>
          <option value="extra">Extra (bono, otro)</option>
        </Select>
      </Field>
      <Field label="Nota" htmlFor="note">
        <Input id="note" name="note" placeholder="Opcional" />
      </Field>
      {tags.length > 0 && (
        <Field label="Tag" htmlFor="tag_id" hint="Opcional.">
          <Select id="tag_id" name="tag_id" defaultValue="">
            <option value="">Sin tag</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="¿Cómo cobras?" htmlFor="payment_method" hint="El dinero entra a esa cuenta automáticamente.">
        <Select id="payment_method" name="payment_method" defaultValue={settings.payment_method ?? "efectivo"}>
          <option value="efectivo">Efectivo</option>
          <option value="banco">Depósito / transferencia (banco)</option>
          <option value="tarjeta_debito">Tarjeta débito</option>
          <option value="tarjeta_credito">Tarjeta crédito</option>
        </Select>
      </Field>
      {accounts.length > 0 && (
        <Field
          label="O elige una cuenta existente"
          htmlFor="account_id"
          hint="Opcional. Si la eliges, tiene prioridad sobre ¿Cómo cobras?."
        >
          <Select id="account_id" name="account_id" defaultValue="">
            <option value="">Usar “¿Cómo cobras?”</option>
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

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  await runSalaryCatchUp();

  const sp = await searchParams;
  const tagFilter = sp.tag || "";
  const [settings, salaries, accounts, tags] = await Promise.all([
    getSalarySettings(),
    getSalaries(),
    getSavingsAccounts(),
    getTags(),
  ]);
  const visibleSalaries = tagFilter ? salaries.filter((s) => s.tag_id === tagFilter) : salaries;

  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const monthTotal = salaries
    .filter((s) => s.pay_date.slice(0, 7) === thisMonth)
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const nextPay = nextPayDateFrom(settings.next_pay_date, settings.frequency, today);
  const daysToPay = nextPay ? daysBetween(today, nextPay) : null;

  return (
    <>
      <PageHeader
        title="Ingresos"
        subtitle="Tu sueldo e ingresos extra"
        action={
          <NewSalaryForm
            settings={settings}
            tags={tags}
            accounts={accounts}
            today={today}
            triggerLabel="Nuevo"
            trigger="pill"
          />
        }
      />

      {/* Recibido este mes */}
      <div className="bg-gradient-brand rounded-[var(--radius-glass)] p-4 sm:p-5 mb-3 flex items-center justify-between gap-3 overflow-hidden shadow-lg shadow-black/10">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">Recibido este mes</p>
          <MoneyValue value={monthTotal} className="block text-money-lg font-extrabold text-white mt-1" />
        </div>
        <span className="grid place-items-center size-14 rounded-full bg-white/20 text-white shrink-0">
          <Icon name="wallet" size={28} />
        </span>
      </div>

      <div className="mb-4">
        <StatTile
          label="Próximo ingreso"
          value={nextPay ? formatDateShort(nextPay) : "—"}
          sub={
            nextPay == null
              ? "Configura tu frecuencia de cobro"
              : daysToPay === 0
                ? "Es hoy"
                : daysToPay === 1
                  ? "Mañana"
                  : `En ${daysToPay} días`
          }
          icon="clock"
          tone="neutral"
        />
      </div>

      {/* Configuración del sueldo */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Configuración del sueldo</p>
            <p className="text-xs text-muted mt-0.5">
              Monto por defecto:{" "}
              <span className="font-semibold text-ink">
                <Money value={settings.default_amount} />
              </span>{" "}
              · {FREQ_LABEL[settings.frequency]}
            </p>
          </div>
          <FormModal
            title="Configuración del sueldo"
            action={saveSalarySettings}
            trigger="icon"
            triggerIcon="edit"
            triggerAriaLabel="Editar configuración"
          >
            <Field
              label="Monto por defecto"
              htmlFor="default_amount"
              hint="Se usa como sugerencia al registrar un ingreso, y como monto del ingreso automático."
            >
              <MoneyInput
                id="default_amount"
                name="default_amount"
                defaultValue={
                  settings.default_amount ? String(settings.default_amount) : ""
                }
              />
            </Field>
            <Field label="¿Cada cuánto cobras?" htmlFor="frequency">
              <Select id="frequency" name="frequency" defaultValue={settings.frequency}>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal (cada 15 días)</option>
                <option value="mensual">Mensual</option>
              </Select>
            </Field>
            <Field
              label="Próxima fecha de cobro"
              htmlFor="next_pay_date"
              required
              hint="A partir de aquí se calcula (y se registra sola) cada fecha siguiente."
            >
              <Input
                id="next_pay_date"
                name="next_pay_date"
                type="date"
                defaultValue={settings.next_pay_date ?? today}
                required
              />
            </Field>
            <Field
              label="¿Cómo cobras?"
              htmlFor="settings_payment_method"
              hint="A esa cuenta se acredita el ingreso automático."
            >
              <Select id="settings_payment_method" name="payment_method" defaultValue={settings.payment_method ?? "efectivo"}>
                <option value="efectivo">Efectivo</option>
                <option value="banco">Depósito / transferencia (banco)</option>
                <option value="tarjeta_debito">Tarjeta débito</option>
                <option value="tarjeta_credito">Tarjeta crédito</option>
              </Select>
            </Field>
          </FormModal>
        </div>
      </GlassCard>

      {/* Historial */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-bold text-ink">Historial de ingresos</h2>
        {tags.length > 0 && salaries.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="glass inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold text-ink cursor-pointer">
              <Icon name="chevronDown" size={12} />
              {tagFilter ? (tags.find((t) => t.id === tagFilter)?.name ?? "Filtrar") : "Todos"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/ingresos">Todos</Link>
              </DropdownMenuItem>
              {tags.map((t) => (
                <DropdownMenuItem key={t.id} asChild>
                  <Link href={`/ingresos?tag=${t.id}`}>{t.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {visibleSalaries.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Sin ingresos registrados"
          message="Registra tu primer sueldo o ingreso extra."
          action={
            <NewSalaryForm
              settings={settings}
              tags={tags}
              accounts={accounts}
              today={today}
              triggerLabel="Registrar ingreso"
            />
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleSalaries.map((s) => (
            <li key={s.id}>
              <GlassCard className="flex items-center gap-3 py-3">
                <IconBubble icon={s.kind === "extra" ? "trendUp" : "wallet"} tone="neutral" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink"><Money value={Number(s.amount)} /></p>
                  <p className="text-xs text-muted truncate">
                    {formatDateLong(s.pay_date)}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                {!s.confirmed ? (
                  <>
                    <Badge tone="warning">Pendiente</Badge>
                    <ConfirmSalaryButton salaryId={s.id} compact />
                  </>
                ) : (
                  <Badge tone={s.kind === "extra" ? "warning" : "primary"}>
                    {s.kind === "extra" ? "Extra" : "Sueldo"}
                  </Badge>
                )}
                <DeleteButton
                  action={deleteSalary.bind(null, s.id)}
                  title="¿Eliminar ingreso?"
                  message="Se quitará este ingreso del historial."
                />
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
