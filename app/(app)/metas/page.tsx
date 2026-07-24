import { getGoals, getSavingsAccounts, getSavingsMovements } from "@/lib/data";
import { balanceOfAccount } from "@/lib/balances";
import { formatDateShort, clampPct, todayISO, daysBetween } from "@/lib/format";
import { quincenasUntil } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { Money } from "@/components/ui/Money";
import { IconBubble } from "@/components/ui/IconBubble";
import { addAccount, addMovement } from "../balance/actions";
import { addGoal, addProgress, deleteGoal, updateGoal } from "./actions";

export const metadata = { title: "Ahorros · Cachin'" };

function NewSavingsAccountForm({ triggerLabel }: { triggerLabel: string }) {
  return (
    <FormModal title="Nueva cuenta de ahorro" action={addAccount} submitLabel="Crear cuenta" triggerLabel={triggerLabel}>
      <input type="hidden" name="type" value="ahorro" />
      <Field label="Nombre" htmlFor="sa-name" required hint="Ej.: Ahorro efectivo, Ahorro banco…">
        <Input id="sa-name" name="name" placeholder="Ahorro" required />
      </Field>
      <Field label="Saldo inicial" htmlFor="sa-initial" hint="Opcional.">
        <MoneyInput id="sa-initial" name="initial_amount" />
      </Field>
    </FormModal>
  );
}

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
        <Input id="deadline" name="deadline" type="date" />
      </Field>
    </FormModal>
  );
}

export default async function MetasPage() {
  const [goals, accounts, movements] = await Promise.all([
    getGoals(),
    getSavingsAccounts(),
    getSavingsMovements(),
  ]);
  const today = todayISO();

  const currentAmountOf = (goalId: string, fallback: number) => {
    const linked = accounts.find((a) => a.goal_id === goalId);
    return linked ? balanceOfAccount(movements, linked.id) : fallback;
  };

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved = goals.reduce(
    (s, g) => s + currentAmountOf(g.id, Number(g.current_amount)),
    0,
  );

  const generalSavings = accounts.filter((a) => a.type === "ahorro" && !a.goal_id);

  return (
    <>
      <PageHeader
        title="Ahorros"
        subtitle="Ahorra en general o para una meta"
        action={<NewGoalForm triggerLabel="Meta" trigger="pill" />}
      />

      {/* Ahorro general: guardar dinero sin atarlo a una meta específica. */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-bold text-ink">Ahorro general</h2>
        {generalSavings.length > 0 && <NewSavingsAccountForm triggerLabel="Nueva cuenta" />}
      </div>
      {generalSavings.length === 0 ? (
        <GlassCard className="mb-4 flex items-center gap-3">
          <IconBubble icon="piggy" tone="brand" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Aún no tienes ahorro general</p>
            <p className="text-xs text-muted mt-0.5">Guarda dinero sin atarlo a ninguna meta.</p>
          </div>
          <NewSavingsAccountForm triggerLabel="Crear" />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {generalSavings.map((a) => {
            const balance = balanceOfAccount(movements, a.id);
            return (
              <GlassCard key={a.id} className="flex flex-col gap-3 min-w-0">
                <div className="flex items-center gap-3">
                  <IconBubble icon="piggy" tone="brand" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink truncate">{a.name}</p>
                    <MoneyValue value={balance} decimals={false} className="text-lg font-extrabold text-primary" />
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
                      <Input id={`sadepd-${a.id}`} name="date" type="date" defaultValue={today} required />
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
                      <Input id={`saretd-${a.id}`} name="date" type="date" defaultValue={today} required />
                    </Field>
                  </FormModal>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <h2 className="text-sm font-bold text-ink px-1 mb-2">Tus metas</h2>

      {goals.length > 0 && (
        <GlassCard className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">Ahorrado en total</p>
            <MoneyValue
              value={totalSaved}
              decimals={false}
              className="text-xl font-extrabold text-ink"
            />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs text-muted">Objetivo total</p>
            <MoneyValue
              value={totalTarget}
              decimals={false}
              className="text-xl font-extrabold text-primary"
            />
          </div>
        </GlassCard>
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon="goal"
          title="Sin metas todavía"
          message="Crea tu primera meta de ahorro y sigue su progreso visualmente."
          action={<NewGoalForm triggerLabel="Crear meta" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map((g) => {
            const linkedAccount = accounts.find((a) => a.goal_id === g.id);
            const currentAmount = currentAmountOf(g.id, Number(g.current_amount));
            const pct = clampPct(currentAmount, Number(g.target_amount));
            const done = currentAmount >= Number(g.target_amount);
            const daysLeft = g.deadline ? daysBetween(today, g.deadline) : null;
            const perQuincena =
              !done && g.deadline && daysLeft !== null && daysLeft >= 0
                ? (Number(g.target_amount) - currentAmount) / quincenasUntil(today, g.deadline)
                : null;
            return (
              <GlassCard key={g.id} className="flex flex-col gap-3 min-w-0">
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
                          <Input id={`gdepd-${g.id}`} name="date" type="date" defaultValue={today} required />
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
                          <Input id={`gretd-${g.id}`} name="date" type="date" defaultValue={today} required />
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
                      <Input
                        id={`gd-${g.id}`}
                        name="deadline"
                        type="date"
                        defaultValue={g.deadline ?? ""}
                      />
                    </Field>
                  </FormModal>

                  <DeleteButton
                    action={deleteGoal.bind(null, g.id)}
                    title="¿Eliminar meta?"
                    message="Se perderá el progreso registrado."
                  />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </>
  );
}
