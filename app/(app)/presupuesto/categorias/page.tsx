import {
  getBudgetCategories,
  getExceptions,
  getExpenses,
  getPeriodOverrides,
} from "@/lib/data";
import { todayISO, toISODate, clampPct } from "@/lib/format";
import { countWorkdays, exceptionsMap } from "@/lib/calendar";
import { quincenaForDate } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Money } from "@/components/ui/Money";
import { addCategory, deleteCategory, updateCategory } from "../actions";

export const metadata = { title: "Presupuesto · Bolsillo Seguro" };

function NewCategoryForm({ triggerLabel }: { triggerLabel: string }) {
  return (
    <FormModal title="Nueva categoría" action={addCategory} submitLabel="Agregar" triggerLabel={triggerLabel}>
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
      <Field
        label="Límite mensual"
        htmlFor="monthly_limit"
        hint="Opcional. Define cuánto quieres gastar como máximo en esta categoría cada mes — si te pasas, lo verás en ámbar/rojo aquí y en Resumen."
      >
        <MoneyInput id="monthly_limit" name="monthly_limit" />
      </Field>
    </FormModal>
  );
}

export default async function PresupuestoCategoriasPage() {
  const today = todayISO();
  const q = quincenaForDate(today);
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  const monthEnd = toISODate(new Date(q.year, q.month + 1, 0, 12));

  const [categories, exceptions, monthExpenses, overrides] = await Promise.all([
    getBudgetCategories(),
    getExceptions(monthStart, monthEnd),
    getExpenses(monthStart, monthEnd),
    getPeriodOverrides(),
  ]);

  const exMap = exceptionsMap(exceptions);
  const override = overrides.find((o) => o.period_key === q.key);
  const workedQuincena = override ? override.workdays : countWorkdays(q.start, q.end, exMap);

  const activeCats = categories.filter((c) => c.active);
  const perDay = activeCats.reduce((s, c) => s + Number(c.amount_per_workday), 0);
  const estQuincena = perDay * workedQuincena;

  const monthlySpentByCategory = new Map<string, number>();
  for (const e of monthExpenses) {
    if (!e.category_id) continue;
    monthlySpentByCategory.set(
      e.category_id,
      (monthlySpentByCategory.get(e.category_id) ?? 0) + Number(e.amount),
    );
  }

  return (
    <>
      <PageHeader
        title="Presupuesto"
        subtitle="Cuánto planeas gastar por día trabajado"
        action={<NewCategoryForm triggerLabel="Categoría" />}
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
        <StatTile label="Gasto fijo por día" value={<Money value={perDay} />} icon="calc" />
        <StatTile
          label="Estimado esta quincena"
          value={<Money value={estQuincena} decimals={false} />}
          tone="primary"
          icon="budget"
        />
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="budget"
          title="Sin categorías"
          message="Agrega categorías como pasaje, desayuno o almuerzo con su monto por día trabajado."
          action={<NewCategoryForm triggerLabel="Agregar categoría" />}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((c) => {
            const limit = c.monthly_limit != null ? Number(c.monthly_limit) : null;
            const spent = monthlySpentByCategory.get(c.id) ?? 0;
            const pct = limit ? clampPct(spent, limit) : 0;
            const over = limit != null && spent > limit;
            return (
              <li key={c.id}>
                <GlassCard className="py-3">
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
                      <Field
                        label="Límite mensual"
                        htmlFor={`lim-${c.id}`}
                        hint="Opcional. Vacío = sin límite."
                      >
                        <MoneyInput
                          id={`lim-${c.id}`}
                          name="monthly_limit"
                          defaultValue={limit != null ? String(limit) : ""}
                        />
                      </Field>
                    </FormModal>
                    <DeleteButton
                      action={deleteCategory.bind(null, c.id)}
                      title="¿Eliminar categoría?"
                      message="Se quitará del presupuesto."
                    />
                  </div>

                  {limit != null && (
                    <div className="mt-3 pt-3 border-t border-black/5">
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="text-muted">
                          Este mes: <span className="font-bold text-ink"><Money value={spent} decimals={false} /></span>
                        </span>
                        <span className="text-muted">
                          Límite <span className="font-bold text-ink"><Money value={limit} decimals={false} /></span>
                        </span>
                      </div>
                      <ProgressBar
                        value={pct}
                        tone={over ? "danger" : pct >= 80 ? "warning" : "primary"}
                      />
                    </div>
                  )}
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
