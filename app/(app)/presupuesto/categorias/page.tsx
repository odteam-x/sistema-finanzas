import { getBudgetCategories, getExceptions, getPeriodOverrides } from "@/lib/data";
import { todayISO, toISODate, parseISODate } from "@/lib/format";
import { getPeriodDays } from "@/lib/periodConfig";
import { exceptionsMap } from "@/lib/calendar";
import { resolveBudgetBasis } from "@/lib/budgetDays";
import { quincenaForDate } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Money } from "@/components/ui/Money";
import { addCategory, deleteCategory, updateCategory } from "../actions";

export const metadata = { title: "Presupuesto · Cachin'" };

function NewCategoryForm({
  triggerLabel,
  trigger,
}: {
  triggerLabel: string;
  trigger?: "button" | "link" | "icon" | "pill";
}) {
  return (
    <FormModal
      title="Nueva categoría"
      action={addCategory}
      submitLabel="Agregar categoría"
      triggerLabel={triggerLabel}
      trigger={trigger}
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
  );
}

export default async function PresupuestoCategoriasPage() {
  const today = todayISO();
  const q = quincenaForDate(today, await getPeriodDays());
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  // Hasta el final del mes donde CIERRA el período: con días de cobro
  // propios cruza de mes (20 ago -> 4 sep) y cortar en el 31 dejaria fuera
  // dias trabajados de este mismo periodo.
  const qEnd = parseISODate(q.end);
  const monthEnd = toISODate(new Date(qEnd.getFullYear(), qEnd.getMonth() + 1, 0, 12));

  const [categories, exceptions, overrides] = await Promise.all([
    getBudgetCategories(),
    getExceptions(monthStart, monthEnd),
    getPeriodOverrides(),
  ]);

  const exMap = exceptionsMap(exceptions);
  // Días del presupuesto: modo trabajados vs personalizado (lib/budgetDays.ts,
  // fuente única compartida por las 3 pantallas que lo necesitan).
  const basis = resolveBudgetBasis(q, overrides, exMap);
  const workedQuincena = basis.days;

  const activeCats = categories.filter((c) => c.active);
  // Acá SÍ manda la suma manual: esta es la pantalla donde configuras el plan
  // por categoría, así que lo que muestra es tu plan. El "promedio por día"
  // de la pantalla principal es otra cosa — lo que gastas de verdad
  // (lib/spendingHistory.ts).
  const perDay = activeCats.reduce((s, c) => s + Number(c.amount_per_workday), 0);
  const estQuincena = perDay * workedQuincena;

  return (
    <>
      <PageHeader
        title="Presupuesto"
        subtitle="Cuánto planeas gastar por día trabajado"
        action={<NewCategoryForm triggerLabel="Categoría" trigger="pill" />}
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
        <StatTile
          label="Plan por día"
          value={<Money value={perDay} />}
          sub="Lo que asignaste"
          icon="calc"
        />
        <StatTile
          label="Plan de la quincena"
          value={<Money value={estQuincena} decimals={false} />}
          sub="Tu plan × días laborables"
          tone="primary"
          icon="budget"
        />
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="budget"
          illustration="calculator"
          title="Sin categorías"
          message="Agrega categorías como pasaje, desayuno o almuerzo con su monto por día trabajado."
          action={<NewCategoryForm triggerLabel="Agregar categoría" />}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Card className="py-3">
                <div className="flex items-center gap-3">
                  <IconBubble icon="budget" tone="neutral" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink line-clamp-2">{c.name}</p>
                    <p className="text-xs text-muted">
                      <Money value={Number(c.amount_per_workday)} /> / día
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">Quincena</p>
                    <p className="font-bold text-ink">
                      <Money value={Number(c.amount_per_workday) * workedQuincena} decimals={false} />
                    </p>
                  </div>
                  <FormModal
                    title="Editar categoría"
                    action={updateCategory}
                    submitLabel="Guardar categoría"
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
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
