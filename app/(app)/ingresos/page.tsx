import { getSalaries, getSalarySettings } from "@/lib/data";
import {
  formatDOP,
  formatDateLong,
  formatDateShort,
  todayISO,
  daysBetween,
} from "@/lib/format";
import { nextPayDate } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Icon } from "@/components/ui/Icon";
import { addSalary, deleteSalary, saveSalarySettings } from "./actions";
import { DebugError } from "@/components/DebugError";

export const metadata = { title: "Ingresos · Finanzas" };

export default async function IngresosPage() {
  try {
    return await IngresosContent();
  } catch (error) {
    return <DebugError error={error} />;
  }
}

async function IngresosContent() {
  const [settings, salaries] = await Promise.all([
    getSalarySettings(),
    getSalaries(),
  ]);

  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const monthTotal = salaries
    .filter((s) => s.pay_date.slice(0, 7) === thisMonth)
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const nextPay = nextPayDate(today, settings.pay_day_1, settings.pay_day_2);
  const daysToPay = daysBetween(today, nextPay);

  return (
    <>
      <PageHeader
        title="Ingresos"
        subtitle="Sueldo quincenal e ingresos extra"
        action={
          <FormModal
            title="Registrar pago"
            action={addSalary}
            submitLabel="Registrar"
            triggerLabel="Nuevo"
          >
            <Field label="Monto" htmlFor="amount" required>
              <MoneyInput
                id="amount"
                name="amount"
                defaultValue={
                  settings.default_amount ? String(settings.default_amount) : ""
                }
                required
              />
            </Field>
            <Field label="Fecha del pago" htmlFor="pay_date" required>
              <Input id="pay_date" name="pay_date" type="date" defaultValue={today} required />
            </Field>
            <Field label="Tipo" htmlFor="kind">
              <Select id="kind" name="kind" defaultValue="quincena">
                <option value="quincena">Quincena (sueldo)</option>
                <option value="extra">Extra (bono, otro)</option>
              </Select>
            </Field>
            <Field label="Nota" htmlFor="note">
              <Input id="note" name="note" placeholder="Opcional" />
            </Field>
          </FormModal>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatTile
          label="Recibido este mes"
          value={formatDOP(monthTotal)}
          icon="wallet"
        />
        <StatTile
          label="Próximo pago"
          value={formatDateShort(nextPay)}
          sub={
            daysToPay === 0
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
          <div>
            <p className="text-sm font-bold text-ink">Configuración del sueldo</p>
            <p className="text-xs text-muted mt-0.5">
              Quincena por defecto:{" "}
              <span className="font-semibold text-ink">
                {formatDOP(settings.default_amount)}
              </span>{" "}
              · Pagos los días {settings.pay_day_1} y {settings.pay_day_2}
            </p>
          </div>
          <FormModal
            title="Configuración del sueldo"
            action={saveSalarySettings}
            renderTrigger={(open) => (
              <button
                onClick={open}
                aria-label="Editar configuración"
                className="grid place-items-center size-9 rounded-full text-muted hover:bg-black/5 cursor-pointer shrink-0"
              >
                <Icon name="edit" size={18} />
              </button>
            )}
          >
            <Field
              label="Sueldo quincenal por defecto"
              htmlFor="default_amount"
              hint="Se usará como monto sugerido al registrar un pago."
            >
              <MoneyInput
                id="default_amount"
                name="default_amount"
                defaultValue={
                  settings.default_amount ? String(settings.default_amount) : ""
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Día de pago 1" htmlFor="pay_day_1" required>
                <Input
                  id="pay_day_1"
                  name="pay_day_1"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  defaultValue={settings.pay_day_1}
                  required
                />
              </Field>
              <Field label="Día de pago 2" htmlFor="pay_day_2" required>
                <Input
                  id="pay_day_2"
                  name="pay_day_2"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  defaultValue={settings.pay_day_2}
                  required
                />
              </Field>
            </div>
          </FormModal>
        </div>
      </GlassCard>

      {/* Historial */}
      <h2 className="text-sm font-bold text-ink px-1 mb-2">Historial de pagos</h2>
      {salaries.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Sin pagos registrados"
          message="Registra tu primer pago con el botón “Nuevo”."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {salaries.map((s) => (
            <li key={s.id}>
              <GlassCard className="flex items-center gap-3 py-3">
                <span className="grid place-items-center size-10 rounded-full bg-primary-soft text-primary shrink-0">
                  <Icon name={s.kind === "extra" ? "trendUp" : "wallet"} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink tabular">{formatDOP(Number(s.amount))}</p>
                  <p className="text-xs text-muted truncate">
                    {formatDateLong(s.pay_date)}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <Badge tone={s.kind === "extra" ? "warning" : "primary"}>
                  {s.kind === "extra" ? "Extra" : "Quincena"}
                </Badge>
                <DeleteButton
                  action={deleteSalary.bind(null, s.id)}
                  title="¿Eliminar pago?"
                  message="Se quitará este pago del historial."
                />
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
