import {
  getAccountBalances,
  getExchangeRates,
  getGoals,
  getMovementCountsByAccount,
  getRecentMovements,
  getSavingsAccounts,
  getSavingsMovements,
} from "@/lib/data";
import { balanceOfAccount } from "@/lib/balances";
import { formatMoneyIn, ratesMap, toDOP } from "@/lib/currency";
import { formatDateShort, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHead } from "@/components/ui/SectionHead";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { undoDelete } from "../undo-actions";
import { Icon } from "@/components/ui/Icon";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { Money } from "@/components/ui/Money";
import { IconBubble } from "@/components/ui/IconBubble";
import { PeekCarousel } from "@/components/ui/PeekCarousel";
import { CushionField } from "./CushionField";
import { PayCushionButton } from "./PayCushionButton";
import { NewAccountForm } from "./NewAccountForm";
import { ACCOUNT_TYPES, typeInfo } from "./accountTypes";
import type { AccountType } from "@/lib/types";
import {
  addMovement,
  addTransfer,
  deleteAccount,
  deleteMovement,
  updateAccount,
} from "./actions";
import type { SavingsAccount } from "@/lib/types";

export const metadata = { title: "Balance · Cachin'" };

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

/** Mover dinero entre dos cuentas propias. Una sola fila en el ledger
 *  (kind='transferencia'), así que no se cuenta como ingreso ni como gasto
 *  y el "Total en cuentas" no cambia — solo se redistribuye. */
function TransferForm({ accounts, today }: { accounts: SavingsAccount[]; today: string }) {
  return (
    <FormModal
      title="Mover entre cuentas"
      action={addTransfer}
      submitLabel="Transferir"
      /* La acción que define esta pantalla: crear una cuenta se hace una vez,
         mover dinero entre ellas es lo recurrente. Es la única de /balance
         que lleva peso de botón primario. */
      trigger="button"
      triggerIcon="movements"
      triggerLabel="Mover entre cuentas"
      triggerFull
    >
      <Field label="Desde" htmlFor="tr-from" required>
        <Select id="tr-from" name="from_account_id" required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Hacia" htmlFor="tr-to" required hint="Tiene que ser una cuenta distinta.">
        <Select id="tr-to" name="to_account_id" defaultValue={accounts[1]?.id} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Monto" htmlFor="tr-amount" required>
        <MoneyInput id="tr-amount" name="amount" required />
      </Field>
      <Field label="Fecha" htmlFor="tr-date" required>
        <DateField id="tr-date" name="date" defaultValue={today} required />
      </Field>
      <Field label="Nota" htmlFor="tr-note">
        <Input id="tr-note" name="note" placeholder="Opcional" />
      </Field>
    </FormModal>
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
  const [accounts, goals, viewBalances, recentMovements, movementCounts, exchangeRates] =
    await Promise.all([
      getSavingsAccounts(),
      getGoals(),
      // Balance por cuenta calculado en Postgres (vista v_account_balances):
      // evita traer el historial COMPLETO de movimientos solo para sumarlo acá.
      getAccountBalances(),
      // Las tarjetas de cuenta y "últimos movimientos" solo muestran unos
      // pocos, así que el fetch se acota — no hace falta el ledger entero.
      getRecentMovements(12),
      getMovementCountsByAccount(),
      getExchangeRates(),
    ]);
  const rates = ratesMap(exchangeRates);

  // Si la vista todavía no existe (migration-v17 sin correr), se cae al
  // cálculo en JS de siempre sobre el historial completo — mismo patrón de
  // degradación que getMovementStats().
  const fallbackMovements = viewBalances === null ? await getSavingsMovements() : null;
  const balanceOf = (accountId: string) =>
    viewBalances !== null
      ? (viewBalances[accountId] ?? 0)
      : balanceOfAccount(fallbackMovements!, accountId);

  // Suma cuenta por cuenta (lib/balances.ts) para que una transferencia
  // entre dos cuentas propias no infle el total. Cada saldo se convierte a
  // RD$ según su propia moneda antes de sumar — sumar montos crudos de
  // monedas distintas produciría un total sin sentido.
  const totalSaved = accounts.reduce((s, a) => s + toDOP(balanceOf(a.id), a.currency, rates), 0);
  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? "Cuenta";

  return (
    <>
      <PageHeader
        title="Balance"
        subtitle="Ahorro, banco, efectivo y tarjetas"
        action={
          <NewAccountForm
            goals={goals.filter((g) => !accounts.some((acc) => acc.goal_id === g.id))}
            accounts={accounts}
            triggerLabel="Cuenta"
            trigger="pill"
          />
        }
      />

      {/* Total */}
      <div className="tone-balance bg-gradient-brand rounded-card p-4 sm:p-5 mb-4 flex items-center justify-between gap-3 overflow-hidden shadow-hero">
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-brand-muted">Total en cuentas</p>
          <MoneyValue value={totalSaved} className="block money-lg font-extrabold text-on-brand mt-1" />
          <p className="text-xs text-on-brand-muted mt-1">
            {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"}
          </p>
        </div>
        <span className="grid place-items-center size-14 rounded-pill bg-on-brand-well text-on-brand shrink-0">
          <Icon name="wallet" size={28} />
        </span>
      </div>

      {/* Mover dinero entre cuentas propias: no es ingreso ni gasto, así que
          no infla los totales de Movimientos (ver lib/balances.ts). */}
      {accounts.length > 1 && (
        <div className="mb-4">
          <TransferForm accounts={accounts} today={today} />
        </div>
      )}

      {/* Cuentas */}
      {accounts.length === 0 ? (
        <EmptyState
          icon="piggy"
          illustration="wallet"
          title="Sin cuentas todavía"
          message="Crea tu primera cuenta y registra depósitos y retiros."
          action={
            <NewAccountForm
              goals={goals.filter((g) => !accounts.some((acc) => acc.goal_id === g.id))}
              accounts={accounts}
              triggerLabel="Crear cuenta"
            />
          }
        />
      ) : (
        <PeekCarousel>
          {accounts.map((a) => {
            const balance = balanceOf(a.id);
            const count = movementCounts[a.id] ?? 0;
            const info = typeInfo(a.type);
            const isForeign = a.currency !== "DOP";
            const rateKnown = !isForeign || rates[a.currency] > 0;
            return (
              <Card key={a.id}>
                  <div className="flex items-start gap-3">
                    <IconBubble icon={info.icon} tone="brand" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-ink truncate">{a.name}</p>
                        <Badge tone="neutral">{info.label}</Badge>
                        {isForeign && <Badge tone="neutral">{a.currency}</Badge>}
                      </div>
                      {/* text-lg / text-ink, no `money-sm text-primary-fg`:
                          el saldo de cada tarjeta compite de frente con el
                          total del hero si va en teal y a tamaño de monto.
                          Aquí es dato de fila, no la cifra de la pantalla. */}
                      {isForeign ? (
                        <>
                          <p className="text-lg font-extrabold text-ink leading-tight tabular">
                            {formatMoneyIn(balance, a.currency)}
                          </p>
                          <p className="text-xs text-muted">
                            {rateKnown ? (
                              <>≈ <Money value={toDOP(balance, a.currency, rates)} /></>
                            ) : (
                              "Sin tasa configurada — ajústala en Configuración."
                            )}
                          </p>
                        </>
                      ) : (
                        <MoneyValue
                          value={balance}
                          className="block text-lg font-extrabold text-ink leading-tight tabular"
                        />
                      )}
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
                        <CushionField
                          accountId={a.id}
                          otherAccounts={accounts.filter((acc) => acc.id !== a.id)}
                          defaultChecked={a.is_cushion}
                          defaultAmount={a.cushion_payout_amount}
                          defaultTargetId={a.cushion_target_account_id}
                        />
                      </FormModal>
                      <DeleteButton
                        action={deleteAccount.bind(null, a.id)}
                        title="¿Eliminar cuenta?"
                        message="Se eliminarán también sus movimientos."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
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
                        <DateField id={`depd-${a.id}`} name="date" defaultValue={today} required />
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
                        <DateField id={`retd-${a.id}`} name="date" defaultValue={today} required />
                      </Field>
                      <Field label="Nota" htmlFor={`retn-${a.id}`}>
                        <Input id={`retn-${a.id}`} name="note" placeholder="Opcional" />
                      </Field>
                    </FormModal>
                  </div>

                  {a.is_cushion && a.cushion_payout_amount != null && (
                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-line">
                      <div className="min-w-0">
                        <p className="text-xs text-muted">Cuenta colchón</p>
                        <p className="text-sm font-semibold text-ink">
                          <Money value={a.cushion_payout_amount} decimals={false} /> / quincena a{" "}
                          {accountName(a.cushion_target_account_id ?? "")}
                        </p>
                      </div>
                      <PayCushionButton />
                    </div>
                  )}
              </Card>
            );
          })}
        </PeekCarousel>
      )}

      {/* Movimientos recientes */}
      {recentMovements.length > 0 && (
        <>
          <SectionHead title="Movimientos recientes" />
          <ul className="flex flex-col gap-2">
            {recentMovements.map((m) => {
              const isDep = m.kind === "deposito";
              return (
                <li key={m.id}>
                  <Card className="flex items-center gap-3 py-2.5">
                    <IconBubble
                      icon={isDep ? "arrowDownLeft" : "arrowUpRight"}
                      tone={isDep ? "neutral" : "danger"}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">
                        {isDep ? "+" : "−"}
                        <Money value={Number(m.amount)} />
                      </p>
                      <p className="text-xs text-muted truncate">
                        {accountName(m.account_id)} · {formatDateShort(m.date)}
                        {m.note ? ` · ${m.note}` : ""}
                      </p>
                    </div>
                    <Badge tone={isDep ? "primary" : "danger"}>
                      {isDep ? "Depósito" : "Retiro"}
                    </Badge>
                    {/* Mismo criterio que /movimientos: solo se ofrece borrar
                        lo que se registró a mano. Un movimiento espejo (el de
                        un gasto, un sueldo, una cuota de deuda…) borrado solo
                        deja su origen vivo y el dinero de vuelta en la cuenta.
                        deleteMovement lo rechaza igualmente — esto es para que
                        el botón ni siquiera aparezca. */}
                    {m.source === "manual" && !m.source_ref_id && (
                      <DeleteButton
                        action={deleteMovement.bind(null, m.id)}
                        undoAction={undoDelete}
                        title="¿Eliminar movimiento?"
                        message="Se recalculará el saldo de la cuenta."
                      />
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
