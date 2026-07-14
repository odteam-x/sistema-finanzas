import Link from "next/link";
import {
  getBudgetCategories,
  getExceptions,
  getExpenses,
  getPeriodOverrides,
  getSavingsAccounts,
  getTags,
} from "@/lib/data";
import { formatDOP, formatDateShort, todayISO, toISODate, clampPct } from "@/lib/format";
import { countWorkdays, exceptionsMap } from "@/lib/calendar";
import { quincenaForDate } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { BudgetRing } from "@/components/charts/BudgetRing";
import { Illustration } from "@/components/ui/Illustration";
import {
  addCategory,
  addExpense,
  clearPeriodOverride,
  deleteCategory,
  deleteExpense,
  setPeriodOverride,
  updateCategory,
} from "./actions";

export const metadata = { title: "Presupuesto · Bolsillo Seguro" };

export default async function PresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const sp = await searchParams;
  const tagFilter = sp.tag || "";
  const today = todayISO();
  const q = quincenaForDate(today);
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  const monthEnd = toISODate(new Date(q.year, q.month + 1, 0, 12));

  const [categories, exceptions, expenses, monthExpenses, accounts, tags, overrides] =
    await Promise.all([
      getBudgetCategories(),
      getExceptions(monthStart, monthEnd),
      getExpenses(q.start, q.end),
      getExpenses(monthStart, monthEnd),
      getSavingsAccounts(),
      getTags(),
      getPeriodOverrides(),
    ]);

  const exMap = exceptionsMap(exceptions);
  const override = overrides.find((o) => o.period_key === q.key);
  const workedQuincena = override ? override.workdays : countWorkdays(q.start, q.end, exMap);
  const workedMonth = countWorkdays(monthStart, monthEnd, exMap);

  const activeCats = categories.filter((c) => c.active);
  const perDay = activeCats.reduce((s, c) => s + Number(c.amount_per_workday), 0);
  const estQuincena = perDay * workedQuincena;
  const estMonth = perDay * workedMonth;
  const realQuincena = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const restante = estQuincena - realQuincena;
  // El filtro por etiqueta solo afecta la lista visible, no los totales
  // de la quincena (que siempre reflejan todo lo gastado).
  const visibleExpenses = tagFilter ? expenses.filter((e) => e.tag_id === tagFilter) : expenses;

  const tagName = (id: string | null) =>
    id ? (tags.find((t) => t.id === id)?.name ?? "General") : "General";

  // Gasto real del mes calendario por categoría, para el límite mensual
  // (ventana distinta a la quincena — el límite es un tope del mes completo).
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
            <Field
              label="Límite mensual"
              htmlFor="monthly_limit"
              hint="Opcional. Define cuánto quieres gastar como máximo en esta categoría cada mes — si te pasas, lo verás en ámbar/rojo aquí y en Resumen."
            >
              <MoneyInput id="monthly_limit" name="monthly_limit" />
            </Field>
          </FormModal>
        }
      />

      <div className="flex items-center gap-1.5 -mt-3 mb-4 px-1">
        <p className="text-xs text-muted">
          {override ? "Días trabajados (manual):" : "Días laborables calculados:"}{" "}
          <span className="font-semibold text-ink">{workedQuincena}</span>
        </p>
        <FormModal
          title="Días trabajados de esta quincena"
          action={setPeriodOverride}
          submitLabel="Guardar"
          trigger="icon"
          triggerIcon="edit"
          triggerAriaLabel="Editar días trabajados"
        >
          <input type="hidden" name="period_key" value={q.key} />
          <Field
            label="Días trabajados"
            htmlFor="workdays"
            hint="Reemplaza el conteo automático del calendario solo para esta quincena."
          >
            <Input
              id="workdays"
              name="workdays"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={String(workedQuincena)}
              required
            />
          </Field>
        </FormModal>
        {override && (
          <DeleteButton
            action={clearPeriodOverride.bind(null, q.key)}
            label="Quitar"
            title="¿Quitar el ajuste manual?"
            message="Se volverá a calcular automáticamente desde el calendario laboral."
          />
        )}
      </div>

      {/* Anillo gastado vs. presupuesto */}
      <GlassCard className="mb-3">
        <BudgetRing spent={realQuincena} budget={estQuincena} />
      </GlassCard>

      {/* Resumen del periodo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
        <StatTile label="Estimado quincena" value={formatDOP(estQuincena, false)} icon="calc" />
        <StatTile label="Gasto real" value={formatDOP(realQuincena, false)} tone="neutral" icon="wallet" />
        <StatTile
          className="col-span-2 sm:col-span-1"
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
                          Este mes: <span className="font-bold text-ink tabular">{formatDOP(spent, false)}</span>
                        </span>
                        <span className="text-muted">
                          Límite <span className="font-bold text-ink tabular">{formatDOP(limit, false)}</span>
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
          <Field label="Categoría" htmlFor="exp-cat" hint="Categoría general del gasto (independiente del presupuesto por día).">
            <Select id="exp-cat" name="tag_id" defaultValue="">
              <option value="">General</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nota" htmlFor="exp-note">
            <Input id="exp-note" name="note" placeholder="Opcional" />
          </Field>
          {accounts.length > 0 && (
            <Field label="Cuenta" htmlFor="exp-account" hint="Opcional: resta el monto del saldo de esa cuenta.">
              <Select id="exp-account" name="account_id" defaultValue="">
                <option value="">Sin asociar</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </FormModal>
      </div>

      {tags.length > 0 && expenses.length > 0 && (
        <div className="flex items-center gap-2 px-1 mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="glass inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold text-ink cursor-pointer">
              <Icon name="chevronDown" size={12} />
              {tagFilter ? (tags.find((t) => t.id === tagFilter)?.name ?? "Filtrar") : "Todas las categorías"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/presupuesto">Todas las categorías</Link>
              </DropdownMenuItem>
              {tags.map((t) => (
                <DropdownMenuItem key={t.id} asChild>
                  <Link href={`/presupuesto?tag=${t.id}`}>{t.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {visibleExpenses.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Sin gastos registrados"
          message="Registra tus gastos reales para compararlos con el presupuesto."
          illustration={<Illustration name="wallet" width={190} />}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleExpenses.map((e) => (
            <li key={e.id}>
              <GlassCard className="flex items-center gap-3 py-2.5">
                <IconBubble icon="wallet" tone="neutral" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink tabular">
                    {formatDOP(Number(e.amount))}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {formatDateShort(e.date)}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <Badge tone="neutral">{tagName(e.tag_id)}</Badge>
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
