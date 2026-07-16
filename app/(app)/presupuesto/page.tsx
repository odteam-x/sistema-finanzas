import Link from "next/link";
import {
  getBudgetCategories,
  getExceptions,
  getExpenses,
  getPeriodOverrides,
  getSavingsAccounts,
  getSubscriptions,
  getTags,
} from "@/lib/data";
import { formatDateShort, todayISO, toISODate } from "@/lib/format";
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
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { BudgetRing } from "@/components/charts/BudgetRing";
import { Money } from "@/components/ui/Money";
import {
  addExpense,
  clearPeriodOverride,
  deleteExpense,
  setPeriodOverride,
} from "./actions";
import type { SavingsAccount, Tag } from "@/lib/types";

export const metadata = { title: "Gastos · Bolsillo Seguro" };

function NewExpenseForm({
  tags,
  accounts,
  today,
  triggerLabel,
  trigger,
  triggerIcon,
}: {
  tags: Tag[];
  accounts: SavingsAccount[];
  today: string;
  triggerLabel: string;
  trigger?: "button" | "link" | "icon" | "pill";
  triggerIcon?: "plus";
}) {
  return (
    <FormModal
      title="Registrar gasto"
      action={addExpense}
      submitLabel="Registrar"
      triggerLabel={triggerLabel}
      trigger={trigger}
      triggerIcon={triggerIcon}
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
  );
}

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

  const [categories, exceptions, expenses, accounts, tags, overrides, subscriptions] =
    await Promise.all([
      getBudgetCategories(),
      getExceptions(monthStart, monthEnd),
      getExpenses(q.start, q.end),
      getSavingsAccounts(),
      getTags(),
      getPeriodOverrides(),
      getSubscriptions(),
    ]);
  const activeSubs = subscriptions.filter((s) => s.active);

  const exMap = exceptionsMap(exceptions);
  const override = overrides.find((o) => o.period_key === q.key);
  const workedQuincena = override ? override.workdays : countWorkdays(q.start, q.end, exMap);
  const workedMonth = countWorkdays(monthStart, monthEnd, exMap);

  const activeCats = categories.filter((c) => c.active);
  const perDay = activeCats.reduce((s, c) => s + Number(c.amount_per_workday), 0);
  const estQuincena = perDay * workedQuincena;
  const estMonth = perDay * workedMonth;
  const realQuincena = expenses.reduce((s, e) => s + Number(e.amount), 0);
  // El filtro por etiqueta solo afecta la lista visible, no los totales
  // de la quincena (que siempre reflejan todo lo gastado).
  const visibleExpenses = tagFilter ? expenses.filter((e) => e.tag_id === tagFilter) : expenses;

  const tagName = (id: string | null) =>
    id ? (tags.find((t) => t.id === id)?.name ?? "General") : "General";

  return (
    <>
      <PageHeader
        title="Gastos"
        subtitle={`Quincena ${q.label} · ${workedQuincena} días laborables`}
        action={
          <Link
            href="/presupuesto/categorias"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <Icon name="budget" size={16} />
            Presupuesto
          </Link>
        }
      />

      {/* El número de días ya está en el subtítulo del header — aquí solo
          va la acción para ajustarlo, sin repetir la cifra. */}
      <div className="flex items-center gap-1.5 -mt-3 mb-4 px-1">
        <FormModal
          title="Días trabajados de esta quincena"
          action={setPeriodOverride}
          submitLabel="Guardar"
          trigger="link"
          triggerIcon="edit"
          triggerLabel={override ? "Ajuste manual" : "Ajustar días"}
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

      {/* Resumen del periodo — el "Restante/Excedido" vive solo en el
          anillo de arriba, para no repetir la misma cifra dos veces. */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
        <StatTile label="Estimado quincena" value={<Money value={estQuincena} decimals={false} />} icon="calc" />
        <StatTile
          label="Gasto real"
          value={<Money value={realQuincena} decimals={false} />}
          tone="neutral"
          icon="wallet"
        />
      </div>

      <GlassCard className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Gasto fijo por día:{" "}
          <span className="font-bold text-ink">
            <Money value={perDay} />
          </span>
        </p>
        <p className="text-sm text-muted text-right">
          Estimado del mes:{" "}
          <span className="font-bold text-ink">
            <Money value={estMonth} decimals={false} />
          </span>
        </p>
      </GlassCard>

      {/* Cargos fijos: suscripciones activas, visibles aquí pero gestionadas
          en Suscripciones (no duplica el CRUD, solo da contexto). */}
      {activeSubs.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-sm font-bold text-ink">Cargos fijos</h2>
            <Link href="/suscripciones" className="text-sm font-semibold text-primary">
              Gestionar
            </Link>
          </div>
          <ul className="flex flex-col gap-2 mb-6">
            {activeSubs.map((sub) => (
              <li key={sub.id}>
                <GlassCard className="flex items-center gap-3 py-2.5">
                  <IconBubble icon="repeat" tone="neutral" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink line-clamp-2">{sub.name}</p>
                    <p className="text-xs text-muted">
                      <Money value={sub.frequency === "anual" ? Number(sub.amount) / 12 : Number(sub.amount)} />{" "}
                      / mes
                    </p>
                  </div>
                  <Badge tone={sub.frequency === "anual" ? "info" : "neutral"}>
                    {sub.frequency === "anual" ? "Anual" : "Mensual"}
                  </Badge>
                </GlassCard>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Gastos reales */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-bold text-ink">Gastos reales de la quincena</h2>
        <NewExpenseForm
          tags={tags}
          accounts={accounts}
          today={today}
          triggerLabel="Registrar"
          trigger="link"
          triggerIcon="plus"
        />
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
          title="Sin gastos aún"
          message="Registra tus gastos reales para compararlos con el presupuesto."
          action={
            <NewExpenseForm tags={tags} accounts={accounts} today={today} triggerLabel="Registrar gasto" />
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleExpenses.map((e) => (
            <li key={e.id}>
              <GlassCard className="flex items-center gap-3 py-2.5">
                <IconBubble icon="wallet" tone="neutral" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    <Money value={Number(e.amount)} />
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
