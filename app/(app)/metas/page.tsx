import Link from "next/link";
import {
  getAccountBalances,
  getDebts,
  getGoalContributionMovements,
  getGoals,
  getInstallments,
  getSavingsAccounts,
  getSavingsMovements,
} from "@/lib/data";
import { balanceOfAccount } from "@/lib/balances";
import { goalProgress } from "@/lib/goals";
import { formatDateShort, clampPct, todayISO, daysBetween } from "@/lib/format";
import { quincenasUntil } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, MoneyInput, Select } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { Money } from "@/components/ui/Money";
import { IconBubble } from "@/components/ui/IconBubble";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { addMovement, deleteAccount, updateAccount } from "../balance/actions";
import { NewAccountForm } from "../balance/NewAccountForm";
import { addGoal, addProgress, deleteGoal, updateGoal } from "./actions";
import { LinkDebtButton, LinkedDebtsList } from "./GoalDebtLink";
import { undoDelete } from "../undo-actions";

export const metadata = { title: "Ahorros · Cachin'" };

function NewGoalForm({
  triggerLabel,
  trigger,
}: {
  triggerLabel: string;
  trigger?: "button" | "link" | "icon" | "pill";
}) {
  return (
    <FormModal
      title="Nueva meta"
      action={addGoal}
      submitLabel="Crear meta"
      triggerLabel={triggerLabel}
      trigger={trigger}
    >
      <Field label="Nombre" htmlFor="name" required>
        <Input id="name" name="name" placeholder="Fondo de emergencia" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto objetivo" htmlFor="target_amount" required>
          <MoneyInput id="target_amount" name="target_amount" required />
        </Field>
        <Field label="Ya ahorrado" htmlFor="current_amount">
          <MoneyInput id="current_amount" name="current_amount" defaultValue="" />
        </Field>
      </div>
      <Field label="Fecha límite" htmlFor="deadline">
        <DateField id="deadline" name="deadline" />
      </Field>
    </FormModal>
  );
}

export default async function MetasPage() {
  const [goals, accounts, viewBalances, debts, installments, goalContributions] = await Promise.all([
    getGoals(),
    getSavingsAccounts(),
    // Balance por cuenta desde Postgres (v_account_balances) — esta pantalla
    // solo necesita el SALDO de un puñado de cuentas (las vinculadas a una
    // meta + el ahorro general), no el ledger completo de todas las cuentas
    // del usuario.
    getAccountBalances(),
    getDebts(),
    getInstallments(),
    getGoalContributionMovements(),
  ]);
  const today = todayISO();

  // Si la vista aún no existe (migration-v17 sin correr), se cae al cálculo
  // de siempre sobre el historial completo — mismo patrón que en Balance.
  const fallbackMovements = viewBalances === null ? await getSavingsMovements() : null;
  const accountBalance = (accountId: string) =>
    viewBalances !== null
      ? (viewBalances[accountId] ?? 0)
      : balanceOfAccount(fallbackMovements!, accountId);

  // R14: el progreso incluye aportes/ahorro Y lo abonado de deudas
  // vinculadas — cálculo compartido en lib/goals.ts.
  const progressOf = (goal: (typeof goals)[number]) =>
    goalProgress(goal, accounts, accountBalance, debts, installments, goalContributions);

  // Deudas activas todavía sin meta — las que se pueden vincular.
  const unlinkedDebts = debts.filter((d) => !d.goal_id && d.status !== "pagada");

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + progressOf(g).total, 0);

  const generalSavings = accounts.filter((a) => a.type === "ahorro" && !a.goal_id);
  // El encabezado decía "Ahorrado en total" pero solo sumaba metas, dejando
  // fuera el ahorro general que esta MISMA pantalla lista justo debajo: la
  // pantalla se contradecía a sí misma, y no cuadraba con el Dashboard, que sí
  // los suma. Se suma sin convertir moneda, igual que las tarjetas de abajo —
  // si algún día hay una cuenta de ahorro en otra moneda, hay que convertir
  // acá Y en esas tarjetas a la vez, o volvería el mismo descuadre.
  const generalSavingsTotal = generalSavings.reduce((s, a) => s + accountBalance(a.id), 0);
  const savedOverall = totalSaved + generalSavingsTotal;

  return (
    <>
      <PageHeader
        title="Ahorros"
        subtitle="Ahorra en general o para una meta"
        action={<NewGoalForm triggerLabel="Meta" trigger="pill" />}
      />

      {/* La cifra de la pantalla. Estaba a media página, dentro de una
          tarjeta que enfrentaba "Ahorrado" y "Objetivo" al MISMO tamaño
          (text-xl los dos), así que ninguna de las dos mandaba — y encima
          los saldos de ahorro general de arriba iban a text-lg, un tercer
          nivel casi idéntico. Ahora hay un solo protagonista arriba. */}
      {/* Antes esto colgaba de `goals.length > 0`, así que quien tuviera
          ahorro general pero ninguna meta no veía su total por ningún lado. */}
      {(goals.length > 0 || generalSavings.length > 0) && (
        <section className="mb-6 rounded-hero bg-gradient-brand px-5 py-6 shadow-hero">
          <p className="text-sm font-medium text-on-brand-muted">Ahorrado en total</p>
          <MoneyValue
            value={savedOverall}
            decimals={false}
            className="block money-hero font-extrabold text-on-brand tabular mt-0.5"
          />
          <p className="mt-1.5 text-xs text-on-brand-muted">
            {goals.length > 0 ? (
              <>
                De un objetivo de <Money value={totalTarget} decimals={false} /> ·{" "}
                {goals.length} {goals.length === 1 ? "meta" : "metas"}
                {generalSavingsTotal > 0 && <> · Incluye ahorro sin meta asignada</>}
              </>
            ) : (
              <>Todo en ahorro general, sin meta asignada</>
            )}
          </p>
        </section>
      )}

      {/* Ahorro general: guardar dinero sin atarlo a una meta específica. */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-bold text-ink">Ahorro general</h2>
        {generalSavings.length > 0 && (
          <NewAccountForm accounts={accounts} variant="ahorro" trigger="pill" triggerLabel="Nueva cuenta" />
        )}
      </div>
      {generalSavings.length === 0 ? (
        <Card className="mb-4 flex items-center gap-3">
          <IconBubble icon="piggy" tone="brand" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Aún no tienes ahorro general</p>
            <p className="text-xs text-muted mt-0.5">Guarda dinero sin atarlo a ninguna meta.</p>
          </div>
          <NewAccountForm accounts={accounts} variant="ahorro" triggerLabel="Crear" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {generalSavings.map((a) => {
            const balance = accountBalance(a.id);
            return (
              <Card key={a.id} className="flex flex-col gap-3 min-w-0">
                <div className="flex items-center gap-3">
                  <IconBubble icon="piggy" tone="brand" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink truncate">{a.name}</p>
                    <MoneyValue value={balance} decimals={false} className="text-lg font-extrabold text-ink" />
                  </div>
                  {/* R04: editar y eliminar el ahorro desde ESTA pantalla —
                      antes solo se podía desde Balance, aunque la cuenta sea
                      la misma. Reusa las mismas acciones. */}
                  <div className="flex items-center gap-1 shrink-0">
                    <FormModal
                      title={`Editar “${a.name}”`}
                      action={updateAccount}
                      submitLabel="Guardar"
                      trigger="icon"
                      triggerIcon="edit"
                      triggerAriaLabel={`Editar ${a.name}`}
                    >
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="type" value="ahorro" />
                      <Field label="Nombre" htmlFor={`saname-${a.id}`} required>
                        <Input id={`saname-${a.id}`} name="name" defaultValue={a.name} required />
                      </Field>
                    </FormModal>
                    <DeleteButton
                      action={deleteAccount.bind(null, a.id)}
                      title={`¿Eliminar “${a.name}”?`}
                      message="Se eliminarán también sus movimientos, así que su saldo dejará de contar en tu balance. Los gastos e ingresos que apuntaban a esta cuenta se reasignan a tu cuenta por defecto."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
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
                    <Field label="Monto" htmlFor={`sadep-${a.id}`} required>
                      <MoneyInput id={`sadep-${a.id}`} name="amount" required />
                    </Field>
                    <Field label="Fecha" htmlFor={`sadepd-${a.id}`} required>
                      <DateField id={`sadepd-${a.id}`} name="date" defaultValue={today} required />
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
                    <Field label="Monto" htmlFor={`saret-${a.id}`} required>
                      <MoneyInput id={`saret-${a.id}`} name="amount" required />
                    </Field>
                    <Field label="Fecha" htmlFor={`saretd-${a.id}`} required>
                      <DateField id={`saretd-${a.id}`} name="date" defaultValue={today} required />
                    </Field>
                  </FormModal>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="text-sm font-bold text-ink px-1 mb-2">Tus metas</h2>

      {goals.length === 0 ? (
        <EmptyState
          icon="goal"
          illustration="goals"
          title="Sin metas todavía"
          message="Crea tu primera meta de ahorro y sigue su progreso visualmente."
          action={<NewGoalForm triggerLabel="Crear meta" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map((g) => {
            const linkedAccount = accounts.find((a) => a.goal_id === g.id);
            const progress = progressOf(g);
            const currentAmount = progress.total;
            const pct = clampPct(currentAmount, Number(g.target_amount));
            const done = currentAmount >= Number(g.target_amount);
            const daysLeft = g.deadline ? daysBetween(today, g.deadline) : null;
            const perQuincena =
              !done && g.deadline && daysLeft !== null && daysLeft >= 0
                ? (Number(g.target_amount) - currentAmount) / quincenasUntil(today, g.deadline)
                : null;
            return (
              <Card key={g.id} className="flex flex-col gap-3 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink truncate">{g.name}</p>
                    {g.deadline && (
                      <p className="text-xs text-muted">
                        Límite: {formatDateShort(g.deadline)}
                        {daysLeft !== null &&
                          (daysLeft < 0
                            ? " · vencida"
                            : daysLeft === 0
                              ? " · hoy"
                              : ` · ${daysLeft}d`)}
                      </p>
                    )}
                    {linkedAccount && (
                      <p className="text-xs text-muted mt-0.5">
                        Vinculada a {linkedAccount.name}
                      </p>
                    )}
                  </div>
                  {done && <Badge tone="success">Lograda</Badge>}
                </div>

                {/* R14: de dónde viene el progreso — aportes vs. pago de
                    deudas vinculadas, con enlace a la deuda. */}
                {progress.fromDebts > 0 && (
                  <div className="rounded-tile bg-surface-sunken p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-ink">De dónde viene</span>
                      <InfoTooltip label="De dónde viene el progreso" className="text-muted">
                        Lo que abonas a una deuda vinculada cuenta como progreso de esta meta: cada
                        cuota que pagas te acerca a tenerla libre.
                      </InfoTooltip>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">De ahorros</span>
                      <span className="font-semibold text-ink">
                        <Money value={progress.fromSavings} decimals={false} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-muted">De pagar deudas</span>
                      <span className="font-semibold text-ink">
                        <Money value={progress.fromDebts} decimals={false} />
                      </span>
                    </div>
                  </div>
                )}
                <LinkedDebtsList linked={progress.linkedDebts} />

                <div>
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-sm font-bold text-ink">
                      <Money value={currentAmount} decimals={false} />
                    </span>
                    <span className="text-xs text-muted">
                      de <Money value={Number(g.target_amount)} decimals={false} />
                    </span>
                  </div>
                  <ProgressBar value={pct} tone={done ? "primary" : "primary"} />
                  <div className="flex items-center justify-between mt-1">
                    {perQuincena != null ? (
                      <p className="text-xs text-muted">
                        <Money value={perQuincena} decimals={false} />/quincena para llegar
                      </p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-muted">{Math.round(pct)}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-auto">
                  {linkedAccount ? (
                    <>
                      <FormModal
                        title={`Depositar en “${linkedAccount.name}”`}
                        action={addMovement}
                        submitLabel="Depositar"
                        trigger="pill"
                        triggerIcon="arrowDownLeft"
                        triggerLabel="Depositar"
                      >
                        <input type="hidden" name="account_id" value={linkedAccount.id} />
                        <input type="hidden" name="kind" value="deposito" />
                        <Field label="Monto" htmlFor={`gdep-${g.id}`} required>
                          <MoneyInput id={`gdep-${g.id}`} name="amount" required />
                        </Field>
                        <Field label="Fecha" htmlFor={`gdepd-${g.id}`} required>
                          <DateField id={`gdepd-${g.id}`} name="date" defaultValue={today} required />
                        </Field>
                      </FormModal>
                      <FormModal
                        title={`Retirar de “${linkedAccount.name}”`}
                        action={addMovement}
                        submitLabel="Retirar"
                        trigger="pill"
                        triggerTone="ghost"
                        triggerIcon="arrowUpRight"
                        triggerLabel="Retirar"
                      >
                        <input type="hidden" name="account_id" value={linkedAccount.id} />
                        <input type="hidden" name="kind" value="retiro" />
                        <Field label="Monto" htmlFor={`gret-${g.id}`} required>
                          <MoneyInput id={`gret-${g.id}`} name="amount" required />
                        </Field>
                        <Field label="Fecha" htmlFor={`gretd-${g.id}`} required>
                          <DateField id={`gretd-${g.id}`} name="date" defaultValue={today} required />
                        </Field>
                      </FormModal>
                    </>
                  ) : (
                    <FormModal
                      title={`Aportar a “${g.name}”`}
                      action={addProgress}
                      submitLabel="Aportar"
                      trigger="pill"
                      triggerIcon="plus"
                      triggerLabel="Aportar"
                    >
                      <input type="hidden" name="id" value={g.id} />
                      <Field
                        label="Monto a aportar"
                        htmlFor={`add-${g.id}`}
                        required
                        hint="Usa un monto negativo para corregir (retirar)."
                      >
                        <MoneyInput id={`add-${g.id}`} name="amount" required />
                      </Field>
                      {/* Sin cuentas el Select saldría vacío y `required` lo
                          volvería imposible de enviar. Se avisa en su lugar. */}
                      {accounts.length > 0 ? (
                        <Field
                          label="¿De qué cuenta sale?"
                          htmlFor={`addacc-${g.id}`}
                          required
                          hint="El dinero sale de esa cuenta de verdad (o vuelve, si retiras)."
                        >
                          <Select
                            id={`addacc-${g.id}`}
                            name="account_id"
                            required
                            defaultValue={accounts[0]?.id ?? ""}
                          >
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      ) : (
                        <p className="text-sm text-muted">
                          Necesitas una cuenta primero.{" "}
                          <Link href="/balance" className="font-semibold text-primary-fg">
                            Crear una en Balance
                          </Link>
                          .
                        </p>
                      )}
                    </FormModal>
                  )}

                  <FormModal
                    title="Editar meta"
                    action={updateGoal}
                    submitLabel="Guardar"
                    trigger="icon"
                    triggerIcon="edit"
                    triggerAriaLabel={`Editar ${g.name}`}
                  >
                    <input type="hidden" name="id" value={g.id} />
                    <Field label="Nombre" htmlFor={`gn-${g.id}`} required>
                      <Input id={`gn-${g.id}`} name="name" defaultValue={g.name} required />
                    </Field>
                    <Field label="Monto objetivo" htmlFor={`gt-${g.id}`} required>
                      <MoneyInput
                        id={`gt-${g.id}`}
                        name="target_amount"
                        defaultValue={String(g.target_amount)}
                        required
                      />
                    </Field>
                    <Field label="Fecha límite" htmlFor={`gd-${g.id}`}>
                      <DateField
                        id={`gd-${g.id}`}
                        name="deadline"
                        defaultValue={g.deadline ?? ""}
                      />
                    </Field>
                  </FormModal>

                  <DeleteButton
                    action={deleteGoal.bind(null, g.id)}
                        undoAction={undoDelete}
                    title="¿Eliminar meta?"
                    message="Se perderá el progreso registrado. Las deudas vinculadas no se borran, solo se desvinculan."
                  />
                </div>

                <LinkDebtButton goalId={g.id} available={unlinkedDebts} />
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
