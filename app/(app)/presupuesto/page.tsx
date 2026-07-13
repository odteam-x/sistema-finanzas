import { getBudgetCategories, getExceptions, getExpenses } from "@/lib/data";
import { formatDOP, formatDateShort, todayISO, toISODate } from "@/lib/format";
import { countWorkdays, exceptionsMap } from "@/lib/calendar";
import { quincenaForDate } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Icon } from "@/components/ui/Icon";
import {
  addCategory,
  addExpense,
  deleteCategory,
  deleteExpense,
  updateCategory,
} from "./actions";

export const metadata = { title: "Presupuesto · Bolsillo Seguro" };

export default async function PresupuestoPage() {
  const today = todayISO();
  const q = quincenaForDate(today);
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  const monthEnd = toISODate(new Date(q.year, q.month + 1, 0, 12));

  const [categories, exceptions, expenses] = await Promise.all([
    getBudgetCategories(),
    getExceptions(monthStart, monthEnd),
    getExpenses(q.start, q.end),
  ]);

  const exMap = exceptionsMap(exceptions);
  const workedQuincena = countWorkdays(q.start, q.end, exMap);
  const workedMonth = countWorkdays(monthStart, monthEnd, exMap);

  const activeCats = categories.filter((c) => c.active);
  const perDay = activeCats.reduce((s, c) => s + Number(c.amount_per_workday), 0);
  const estQuincena = perDay * workedQuincena;
  const estMonth = perDay * workedMonth;
  const realQuincena = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const restante = estQuincena - realQuincena;

  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? "General") : "General";

  return (
    <>
      <PageHeader
        title="Presupuesto"
        subtitle={`Quincena ${q.label} · ${workedQuincena} días laborables`}
        action={
          <FormModal
            title="Nueva categoría"
            action={addCategory}
            submitLabel="Agregar"
            triggerLabel="Categoría"
          >
            <Field
              label="Nombre"
              htmlFor="name"
              required
              hint="Ej.: Pasaje ida, Pasaje vuelta, Desayuno, Almuerzo, Imprevistos"
            >
              <Input id="name" name="name" placeholder="Pasaje ida" required />
            </Field>
            <Field label="Monto por día trabajado" htmlFor="amount_per_workday" required>
              <MoneyInput id="amount_per_workday" name="amount_per_workday" required />
            </Field>
          </FormModal>
        }
      />

      {/* Resumen del periodo */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatTile label="Estimado quincena" value={formatDOP(estQuincena, false)} icon="calc" />
        <StatTile label="Gasto real" value={formatDOP(realQuincena, false)} tone="neutral" icon="wallet" />
        <StatTile
          label={restante >= 0 ? "Restante" : "Excedido"}
          value={formatDOP(Math.abs(restante), false)}
          tone={restante >= 0 ? "primary" : "danger"}
          icon={restante >= 0 ? "trendUp" : "trendDown"}
        />
      </div>

      <GlassCard className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Gasto fijo por día:{" "}
          <span className="font-bold text-ink tabular">{formatDOP(perDay)}</span>
        </p>
        <p className="text-sm text-muted text-right">
          Estimado del mes:{" "}
          <span className="font-bold text-ink tabular">
            {formatDOP(estMonth, false)}
          </span>
        </p>
      </GlassCard>

      {/* Categorías */}
      <h2 className="text-sm font-bold text-ink px-1 mb-2">Categorías por día</h2>
      {categories.length === 0 ? (
        <EmptyState
          icon="budget"
          title="Sin categorías"
          message="Agrega categorías como pasaje, desayuno o almuerzo con su monto por día trabajado."
        />
      ) : (
        <ul className="flex flex-col gap-2 mb-6">
          {categories.map((c) => (
            <li key={c.id}>
              <GlassCard className="flex items-center gap-3 py-3">
                <span className="grid place-items-center size-10 rounded-full bg-primary-soft text-primary shrink-0">
                  <Icon name="budget" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink truncate">{c.name}</p>
                  <p className="text-xs text-muted tabular">
                    {formatDOP(Number(c.amount_per_workday))} / día
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">Quincena</p>
                  <p className="font-bold text-ink tabular">
                    {formatDOP(Number(c.amount_per_workday) * workedQuincena, false)}
                  </p>
                </div>
                <FormModal
                  title="Editar categoría"
                  action={updateCategory}
                  submitLabel="Guardar"
                  trigger="icon"
                  triggerIcon="edit"
                  triggerAriaLabel={`Editar ${c.name}`}
                >
                  <input type="hidden" name="id" value={c.id} />
                  <Field label="Nombre" htmlFor={`name-${c.id}`} required>
                    <Input id={`name-${c.id}`} name="name" defaultValue={c.name} required />
                  </Field>
                  <Field label="Monto por día trabajado" htmlFor={`amt-${c.id}`} required>
                    <MoneyInput
                      id={`amt-${c.id}`}
                      name="amount_per_workday"
                      defaultValue={String(c.amount_per_workday)}
                      required
                    />
                  </Field>
                </FormModal>
                <DeleteButton
                  action={deleteCategory.bind(null, c.id)}
                  title="¿Eliminar categoría?"
                  message="Se quitará del presupuesto."
                />
              </GlassCard>
            </li>
          ))}
        </ul>
      )}

      {/* Gastos reales */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-bold text-ink">Gastos reales de la quincena</h2>
        <FormModal
          title="Registrar gasto"
          action={addExpense}
          submitLabel="Registrar"
          trigger="link"
          triggerIcon="plus"
          triggerLabel="Registrar"
        >
          <Field label="Monto" htmlFor="exp-amount" required>
            <MoneyInput id="exp-amount" name="amount" required />
          </Field>
          <Field label="Fecha" htmlFor="exp-date" required>
            <Input id="exp-date" name="date" type="date" defaultValue={today} required />
          </Field>
          <Field label="Categoría" htmlFor="exp-cat">
            <Select id="exp-cat" name="category_id" defaultValue="">
              <option value="">General</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nota" htmlFor="exp-note">
            <Input id="exp-note" name="note" placeholder="Opcional" />
          </Field>
        </FormModal>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Sin gastos registrados"
          message="Registra tus gastos reales para compararlos con el presupuesto."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {expenses.map((e) => (
            <li key={e.id}>
              <GlassCard className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink tabular">
                    {formatDOP(Number(e.amount))}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {formatDateShort(e.date)}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <Badge tone="neutral">{categoryName(e.category_id)}</Badge>
                <DeleteButton
                  action={deleteExpense.bind(null, e.id)}
                  title="¿Eliminar gasto?"
                  message="Se quitará del historial de gastos."
                />
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
