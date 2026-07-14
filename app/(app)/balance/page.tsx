import { getGoals, getSavingsAccounts, getSavingsMovements } from "@/lib/data";
import { formatDOP, formatDateShort, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { IconBubble } from "@/components/ui/IconBubble";
import { PeekCarousel } from "@/components/ui/PeekCarousel";
import { PiggyBank } from "@/components/illustrations";
import type { AccountType } from "@/lib/types";
import {
  addAccount,
  addMovement,
  deleteAccount,
  deleteMovement,
  updateAccount,
} from "./actions";

export const metadata = { title: "Balance · Bolsillo Seguro" };

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: IconName }[] = [
  { value: "ahorro", label: "Ahorro / Alcancía", icon: "piggy" },
  { value: "banco", label: "Banco", icon: "bank" },
  { value: "efectivo", label: "Efectivo", icon: "wallet" },
  { value: "tarjeta_debito", label: "Tarjeta débito", icon: "debt" },
  { value: "tarjeta_credito", label: "Tarjeta crédito", icon: "debt" },
];

const typeInfo = (type: AccountType) =>
  ACCOUNT_TYPES.find((t) => t.value === type) ?? ACCOUNT_TYPES[0];

function TypeField({ defaultValue }: { defaultValue?: AccountType }) {
  return (
    <Field label="Tipo de cuenta" htmlFor="type">
      <Select id="type" name="type" defaultValue={defaultValue ?? "ahorro"}>
        {ACCOUNT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function GoalField({
  goals,
  idPrefix,
  defaultValue,
}: {
  goals: { id: string; name: string }[];
  idPrefix: string;
  defaultValue?: string | null;
}) {
  if (goals.length === 0) return null;
  return (
    <Field
      label="Vincular a una meta"
      htmlFor={`${idPrefix}-goal`}
      hint="Opcional. El saldo de esta cuenta será el progreso de esa meta."
    >
      <Select id={`${idPrefix}-goal`} name="goal_id" defaultValue={defaultValue ?? ""}>
        <option value="">Sin vincular</option>
        {goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export default async function BalancePage() {
  const today = todayISO();
  const [accounts, movements, goals] = await Promise.all([
    getSavingsAccounts(),
    getSavingsMovements(),
    getGoals(),
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
        title="Balance"
        subtitle="Ahorro, banco, efectivo y tarjetas"
        action={
          <FormModal
            title="Nueva cuenta"
            action={addAccount}
            submitLabel="Crear cuenta"
            triggerLabel="Cuenta"
          >
            <Field label="Nombre" htmlFor="name" required>
              <Input id="name" name="name" placeholder="Ej.: Banco BHD, Efectivo…" required />
            </Field>
            <TypeField />
            <Field label="Saldo inicial" htmlFor="initial_amount" hint="Opcional.">
              <MoneyInput id="initial_amount" name="initial_amount" />
            </Field>
            <GoalField
              goals={goals.filter((g) => !accounts.some((acc) => acc.goal_id === g.id))}
              idPrefix="new"
            />
          </FormModal>
        }
      />

      {/* Total */}
      <div className="bg-gradient-brand rounded-[var(--radius-glass)] p-4 sm:p-5 mb-4 flex items-center justify-between gap-3 overflow-hidden shadow-lg shadow-black/10">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">Total en cuentas</p>
          <MoneyValue value={totalSaved} className="block text-money-lg font-extrabold text-white mt-1" />
          <p className="text-xs text-white/70 mt-1">
            {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"}
          </p>
        </div>
        <span className="grid place-items-center size-14 rounded-full bg-white/20 text-white shrink-0">
          <Icon name="wallet" size={28} />
        </span>
      </div>

      {/* Cuentas */}
      {accounts.length === 0 ? (
        <EmptyState
          icon="piggy"
          title="Sin cuentas todavía"
          message="Crea tu primera cuenta (banco, efectivo, ahorro…) y registra depósitos y retiros."
          illustration={<PiggyBank size={104} />}
        />
      ) : (
        <PeekCarousel>
          {accounts.map((a) => {
            const balance = balanceOf(a.id);
            const count = movements.filter((m) => m.account_id === a.id).length;
            const info = typeInfo(a.type);
            return (
              <GlassCard key={a.id}>
                  <div className="flex items-start gap-3">
                    <IconBubble icon={info.icon} tone="brand" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-ink truncate">{a.name}</p>
                        <Badge tone="neutral">{info.label}</Badge>
                      </div>
                      <MoneyValue
                        value={balance}
                        className="block text-money-md font-extrabold text-primary leading-tight"
                      />
                      <p className="text-xs text-muted">
                        {count} {count === 1 ? "movimiento" : "movimientos"}
                        {a.goal_id &&
                          ` · Meta: ${goals.find((g) => g.id === a.goal_id)?.name ?? ""}`}
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
                        <TypeField defaultValue={a.type} />
                        <GoalField
                          goals={goals.filter(
                            (g) => g.id === a.goal_id || !accounts.some((acc) => acc.goal_id === g.id),
                          )}
                          idPrefix={`edit-${a.id}`}
                          defaultValue={a.goal_id}
                        />
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
            );
          })}
        </PeekCarousel>
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
                    <IconBubble
                      icon={isDep ? "arrowDownLeft" : "arrowUpRight"}
                      tone={isDep ? "neutral" : "danger"}
                      size="sm"
                    />
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
