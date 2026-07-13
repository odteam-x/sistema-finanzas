import { getGoals } from "@/lib/data";
import { formatDOP, formatDateShort, clampPct, todayISO, daysBetween } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { addGoal, addProgress, deleteGoal, updateGoal } from "./actions";
import { DebugError } from "@/components/DebugError";

export const metadata = { title: "Metas · Finanzas" };

const GOAL_ICONS: { value: IconName; label: string }[] = [
  { value: "goal", label: "Meta" },
  { value: "wallet", label: "Ahorro" },
  { value: "clock", label: "Tiempo" },
  { value: "calendar", label: "Viaje" },
  { value: "bulb", label: "Idea" },
  { value: "trendUp", label: "Inversión" },
];

const validIcon = (icon: string | null): IconName =>
  GOAL_ICONS.some((g) => g.value === icon) ? (icon as IconName) : "goal";

function IconField({ defaultValue }: { defaultValue?: string }) {
  return (
    <Field label="Ícono" htmlFor="icon">
      <Select id="icon" name="icon" defaultValue={defaultValue ?? "goal"}>
        {GOAL_ICONS.map((g) => (
          <option key={g.value} value={g.value}>
            {g.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export default async function MetasPage() {
  try {
    return await MetasContent();
  } catch (error) {
    return <DebugError error={error} />;
  }
}

async function MetasContent() {
  const goals = await getGoals();
  const today = todayISO();

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle="Tu tablero de objetivos financieros"
        action={
          <FormModal
            title="Nueva meta"
            action={addGoal}
            submitLabel="Crear meta"
            triggerLabel="Meta"
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
            <IconField />
          </FormModal>
        }
      />

      {goals.length > 0 && (
        <GlassCard className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Ahorrado en total</p>
            <p className="text-xl font-extrabold text-ink tabular">
              {formatDOP(totalSaved, false)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Objetivo total</p>
            <p className="text-xl font-extrabold text-primary tabular">
              {formatDOP(totalTarget, false)}
            </p>
          </div>
        </GlassCard>
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon="goal"
          title="Sin metas todavía"
          message="Crea tu primera meta de ahorro y sigue su progreso visualmente."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map((g) => {
            const pct = clampPct(Number(g.current_amount), Number(g.target_amount));
            const done = Number(g.current_amount) >= Number(g.target_amount);
            const daysLeft = g.deadline ? daysBetween(today, g.deadline) : null;
            return (
              <GlassCard key={g.id} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid place-items-center size-11 rounded-2xl bg-primary-soft text-primary shrink-0">
                    <Icon name={validIcon(g.icon)} size={22} />
                  </span>
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
                  </div>
                  {done && <Badge tone="success">Lograda</Badge>}
                </div>

                <div>
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-sm font-bold text-ink tabular">
                      {formatDOP(Number(g.current_amount), false)}
                    </span>
                    <span className="text-xs text-muted tabular">
                      de {formatDOP(Number(g.target_amount), false)}
                    </span>
                  </div>
                  <ProgressBar value={pct} tone={done ? "primary" : "primary"} />
                  <p className="text-xs text-muted mt-1 text-right">
                    {Math.round(pct)}%
                  </p>
                </div>

                <div className="flex items-center gap-1 mt-auto">
                  <FormModal
                    title={`Aportar a “${g.name}”`}
                    action={addProgress}
                    submitLabel="Aportar"
                    renderTrigger={(open) => (
                      <button
                        onClick={open}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-9 rounded-full bg-primary-soft text-primary font-semibold text-sm hover:bg-primary/15 cursor-pointer"
                      >
                        <Icon name="plus" size={16} />
                        Aportar
                      </button>
                    )}
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

                  <FormModal
                    title="Editar meta"
                    action={updateGoal}
                    submitLabel="Guardar"
                    renderTrigger={(open) => (
                      <button
                        onClick={open}
                        aria-label={`Editar ${g.name}`}
                        className="grid place-items-center size-9 rounded-full text-muted hover:bg-black/5 cursor-pointer"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                    )}
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
                    <IconField defaultValue={validIcon(g.icon)} />
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
