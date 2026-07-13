import { getSavingsAccounts, getSavingsMovements } from "@/lib/data";
import { formatDOP, formatDateShort, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { CoinStack } from "@/components/illustrations";
import {
  addAccount,
  addMovement,
  deleteAccount,
  deleteMovement,
  updateAccount,
} from "./actions";

export const metadata = { title: "Ahorros · Finanzas" };

const ACCOUNT_ICONS: { value: IconName; label: string }[] = [
  { value: "piggy", label: "Alcancía" },
  { value: "wallet", label: "Efectivo" },
  { value: "debt", label: "Banco / Tarjeta" },
  { value: "goal", label: "Otro" },
];

const validIcon = (icon: string | null): IconName =>
  ACCOUNT_ICONS.some((a) => a.value === icon) ? (icon as IconName) : "piggy";

function IconField({ defaultValue }: { defaultValue?: string }) {
  return (
    <Field label="Ícono" htmlFor="icon">
      <Select id="icon" name="icon" defaultValue={defaultValue ?? "piggy"}>
        {ACCOUNT_ICONS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export default async function AhorrosPage() {
  const today = todayISO();
  const [accounts, movements] = await Promise.all([
    getSavingsAccounts(),
    getSavingsMovements(),
  ]);

  const balanceOf = (accountId: string) =>
    movements
      .filter((m) => m.account_id === accountId)
      .reduce((s, m) => s + (m.kind === "deposito" ? 1 : -1) * Number(m.amount), 0);

  const totalSaved = accounts.reduce((s, a) => s + balanceOf(a.id), 0);
  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? "Cuenta";
  const recentMovements = movements.slice(0, 12);

  return (
    <>
      <PageHeader
        title="Ahorros"
        subtitle="Tus cuentas y movimientos"
        action={
          <FormModal
            title="Nueva cuenta"
            action={addAccount}
            submitLabel="Crear cuenta"
            triggerLabel="Cuenta"
          >
            <Field label="Nombre" htmlFor="name" required>
              <Input id="name" name="name" placeholder="Ej.: Alcancía, Banco…" required />
            </Field>
            <Field label="Saldo inicial" htmlFor="initial_amount" hint="Opcional.">
              <MoneyInput id="initial_amount" name="initial_amount" />
            </Field>
            <IconField />
          </FormModal>
        }
      />

      {/* Total ahorrado */}
      <GlassCard strong className="mb-4 flex items-center justify-between gap-3 overflow-hidden">
        <div>
          <p className="text-sm font-medium text-muted">Total ahorrado</p>
          <p className="text-3xl font-extrabold tracking-tight text-primary tabular mt-1">
            {formatDOP(totalSaved)}
          </p>
          <p className="text-xs text-muted mt-1">
            {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"}
          </p>
        </div>
        <CoinStack size={96} className="shrink-0 -mr-1" />
      </GlassCard>

      {/* Cuentas */}
      {accounts.length === 0 ? (
        <EmptyState
          icon="piggy"
          title="Sin cuentas de ahorro"
          message="Crea tu primera cuenta (alcancía, banco, efectivo…) y registra depósitos y retiros."
        />
      ) : (
        <ul className="flex flex-col gap-3 mb-6">
          {accounts.map((a) => {
            const balance = balanceOf(a.id);
            const count = movements.filter((m) => m.account_id === a.id).length;
            return (
              <li key={a.id}>
                <GlassCard>
                  <div className="flex items-start gap-3">
                    <span className="grid place-items-center size-11 rounded-2xl bg-primary-soft text-primary shrink-0">
                      <Icon name={validIcon(a.icon)} size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink truncate">{a.name}</p>
                      <p className="text-2xl font-extrabold text-primary tabular leading-tight">
                        {formatDOP(balance)}
                      </p>
                      <p className="text-xs text-muted">
                        {count} {count === 1 ? "movimiento" : "movimientos"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <FormModal
                        title="Editar cuenta"
                        action={updateAccount}
                        submitLabel="Guardar"
                        trigger="icon"
                        triggerIcon="edit"
                        triggerAriaLabel={`Editar ${a.name}`}
                      >
                        <input type="hidden" name="id" value={a.id} />
                        <Field label="Nombre" htmlFor={`an-${a.id}`} required>
                          <Input id={`an-${a.id}`} name="name" defaultValue={a.name} required />
                        </Field>
                        <IconField defaultValue={validIcon(a.icon)} />
                      </FormModal>
                      <DeleteButton
                        action={deleteAccount.bind(null, a.id)}
                        title="¿Eliminar cuenta?"
                        message="Se eliminarán también sus movimientos."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
                    <FormModal
                      title={`Depositar en “${a.name}”`}
                      action={addMovement}
                      submitLabel="Depositar"
                      trigger="pill"
                      triggerIcon="arrowDownLeft"
                      triggerLabel="Depositar"
                    >
                      <input type="hidden" name="account_id" value={a.id} />
                      <input type="hidden" name="kind" value="deposito" />
                      <Field label="Monto" htmlFor={`dep-${a.id}`} required>
                        <MoneyInput id={`dep-${a.id}`} name="amount" required />
                      </Field>
                      <Field label="Fecha" htmlFor={`depd-${a.id}`} required>
                        <Input id={`depd-${a.id}`} name="date" type="date" defaultValue={today} required />
                      </Field>
                      <Field label="Nota" htmlFor={`depn-${a.id}`}>
                        <Input id={`depn-${a.id}`} name="note" placeholder="Opcional" />
                      </Field>
                    </FormModal>

                    <FormModal
                      title={`Retirar de “${a.name}”`}
                      action={addMovement}
                      submitLabel="Retirar"
                      trigger="pill"
                      triggerTone="ghost"
                      triggerIcon="arrowUpRight"
                      triggerLabel="Retirar"
                    >
                      <input type="hidden" name="account_id" value={a.id} />
                      <input type="hidden" name="kind" value="retiro" />
                      <Field label="Monto" htmlFor={`ret-${a.id}`} required>
                        <MoneyInput id={`ret-${a.id}`} name="amount" required />
                      </Field>
                      <Field label="Fecha" htmlFor={`retd-${a.id}`} required>
                        <Input id={`retd-${a.id}`} name="date" type="date" defaultValue={today} required />
                      </Field>
                      <Field label="Nota" htmlFor={`retn-${a.id}`}>
                        <Input id={`retn-${a.id}`} name="note" placeholder="Opcional" />
                      </Field>
                    </FormModal>
                  </div>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}

      {/* Movimientos recientes */}
      {recentMovements.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-ink px-1 mb-2">Movimientos recientes</h2>
          <ul className="flex flex-col gap-2">
            {recentMovements.map((m) => {
              const isDep = m.kind === "deposito";
              return (
                <li key={m.id}>
                  <GlassCard className="flex items-center gap-3 py-2.5">
                    <span
                      className={
                        "grid place-items-center size-9 rounded-full shrink-0 " +
                        (isDep ? "bg-primary-soft text-primary" : "bg-danger-soft text-danger")
                      }
                    >
                      <Icon name={isDep ? "arrowDownLeft" : "arrowUpRight"} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink tabular">
                        {isDep ? "+" : "−"}
                        {formatDOP(Number(m.amount))}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {accountName(m.account_id)} · {formatDateShort(m.date)}
                        {m.note ? ` · ${m.note}` : ""}
                      </p>
                    </div>
                    <Badge tone={isDep ? "primary" : "danger"}>
                      {isDep ? "Depósito" : "Retiro"}
                    </Badge>
                    <DeleteButton
                      action={deleteMovement.bind(null, m.id)}
                      title="¿Eliminar movimiento?"
                      message="Se recalculará el saldo de la cuenta."
                    />
                  </GlassCard>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
