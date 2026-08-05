import Link from "next/link";
import {
  getCategorizationRules,
  getExceptions,
  getExpenses,
  getPeriodOverrides,
  getSavingsAccounts,
  getSubscriptions,
  getTags,
} from "@/lib/data";
import { formatDateLong, todayISO, toISODate, parseISODate } from "@/lib/format";
import { getPeriodDays } from "@/lib/periodConfig";
import { countWorkdays, exceptionsMap } from "@/lib/calendar";
import { resolveBudgetBasis } from "@/lib/budgetDays";
import { quincenaForDate } from "@/lib/periods";
import { groupByDate } from "@/lib/group";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionHead } from "@/components/ui/SectionHead";
import { BudgetBasisPicker } from "./BudgetBasisPicker";
import { DailySpendCalculator } from "./DailySpendCalculator";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { SPENDING_WINDOW_DAYS, perDayFromHistory, spendingWindow } from "@/lib/spendingHistory";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Field, Select, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon } from "@/components/ui/Icon";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { BudgetRing } from "@/components/charts/BudgetRing";
import { Money } from "@/components/ui/Money";
import { addExpense, clearPeriodOverride, deleteExpense } from "./actions";
import { ExpenseCategoryFields } from "./ExpenseCategoryFields";
import type { CategorizationRule, SavingsAccount, Tag } from "@/lib/types";
import { undoDelete } from "../undo-actions";
import { seedDefaultTagsIfEmpty } from "@/lib/tags";
import { applyCategorizationRulesToPastExpenses } from "@/lib/categorizeCatchUp";

export const metadata = { title: "Gastos · Cachin'" };

function NewExpenseForm({
  tags,
  rules,
  accounts,
  today,
  triggerLabel,
  trigger,
  triggerIcon,
}: {
  tags: Tag[];
  rules: CategorizationRule[];
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
      submitLabel="Registrar gasto"
      triggerLabel={triggerLabel}
      trigger={trigger}
      triggerIcon={triggerIcon}
    >
      <Field label="Monto" htmlFor="exp-amount" required>
        <MoneyInput id="exp-amount" name="amount" required />
      </Field>
      <Field label="Fecha" htmlFor="exp-date" required>
        <DateField id="exp-date" name="date" defaultValue={today} required />
      </Field>
      <ExpenseCategoryFields tags={tags} rules={rules} idPrefix="exp" />
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
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  // Categorías por defecto en español dominicano si el usuario todavía no
  // tiene ninguna — reduce la fricción de arrancar con la lista vacía.
  await seedDefaultTagsIfEmpty();
  // Gastos ya registrados que quedaron sin categoría: si su nota coincide
  // con una regla (nueva o ya existente), se agrupan también — no solo los
  // gastos que se registren de ahora en adelante.
  await applyCategorizationRulesToPastExpenses();

  const sp = await searchParams;
  const tagFilter = sp.tag || "";
  const search = (sp.q ?? "").trim().toLowerCase();
  const today = todayISO();
  const q = quincenaForDate(today, await getPeriodDays());
  const monthStart = toISODate(new Date(q.year, q.month, 1, 12));
  // Hasta el final del mes donde CIERRA el período: con días de cobro
  // propios cruza de mes (20 ago -> 4 sep) y cortar en el 31 dejaria fuera
  // dias trabajados de este mismo periodo.
  const qEnd = parseISODate(q.end);
  const monthEnd = toISODate(new Date(qEnd.getFullYear(), qEnd.getMonth() + 1, 0, 12));

  const window = spendingWindow(today);
  const [exceptions, expenses, accounts, tags, overrides, subscriptions, rules, historyExpenses] =
    await Promise.all([
      getExceptions(monthStart, monthEnd),
      getExpenses(q.start, q.end),
      getSavingsAccounts(),
      getTags(),
      getPeriodOverrides(),
      getSubscriptions(),
      getCategorizationRules(),
      getExpenses(window.from, window.to),
    ]);
  const activeSubs = subscriptions.filter((s) => s.active);

  const exMap = exceptionsMap(exceptions);
  // Días del presupuesto: modo trabajados vs personalizado (lib/budgetDays.ts,
  // fuente única compartida por las 3 pantallas que lo necesitan).
  const basis = resolveBudgetBasis(q, overrides, exMap);
  const workedQuincena = basis.days;
  const workedMonth = countWorkdays(monthStart, monthEnd, exMap);

  // Ya no sale de sumar el presupuesto manual de cada categoría: es lo que de
  // verdad gastas al día según los últimos 90 días (lib/spendingHistory.ts).
  // Las categorías siguen vivas para el desglose y para el plan que se
  // configura en /presupuesto/categorias.
  const perDay = perDayFromHistory(historyExpenses, today);
  const estQuincena = perDay * workedQuincena;
  const estMonth = perDay * workedMonth;
  const realQuincena = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const tagName = (id: string | null) =>
    id ? (tags.find((t) => t.id === id)?.name ?? "General") : "General";

  // El filtro por etiqueta/búsqueda solo afecta la lista visible, no los
  // totales de la quincena (que siempre reflejan todo lo gastado).
  const visibleExpenses = expenses
    .filter((e) => !tagFilter || e.tag_id === tagFilter)
    .filter(
      (e) =>
        !search ||
        (e.note ?? "").toLowerCase().includes(search) ||
        tagName(e.tag_id).toLowerCase().includes(search),
    );
  const visibleTotal = visibleExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const groupedExpenses = groupByDate(visibleExpenses, (e) => e.date);

  function hrefFor(next: { tag?: string }) {
    const params = new URLSearchParams();
    const tag = next.tag ?? sp.tag;
    if (tag) params.set("tag", tag);
    if (sp.q) params.set("q", sp.q);
    const qs = params.toString();
    return qs ? `/presupuesto?${qs}` : "/presupuesto";
  }

  return (
    <>
      <PageHeader
        title="Gastos"
        subtitle={`Quincena ${q.label} · ${workedQuincena} días laborables`}
        action={
          /* El header apuntaba a /presupuesto/categorias — configuración, no
             la acción de la pantalla. Registrar un gasto es lo más frecuente
             de toda la app y era un enlace de 16px a media página. */
          <NewExpenseForm
            tags={tags}
            rules={rules}
            accounts={accounts}
            today={today}
            triggerLabel="Gasto"
            trigger="pill"
            triggerIcon="plus"
          />
        }
      />

      {/* El DATO antes que la herramienta: el anillo gastado-vs-presupuesto
          es la cifra dominante de la pantalla, y estaba por debajo de una
          calculadora que no lee ni escribe nada del presupuesto. */}
      <section className="mb-6">
        <Card>
          <div className="flex items-start justify-between gap-2">
            <BudgetRing spent={realQuincena} budget={estQuincena} />
            <InfoTooltip label="Presupuesto de la quincena">
              {estQuincena > 0 ? (
                <>
                  Se compara contra lo que sueles gastar: tu promedio por día de los últimos{" "}
                  {SPENDING_WINDOW_DAYS} días × {workedQuincena}{" "}
                  {workedQuincena === 1 ? "día" : "días"}
                  {basis.mode === "personalizado"
                    ? " que elegiste a mano"
                    : " laborables del período"}
                  . Si te pasas, es que estás gastando más de lo habitual.
                </>
              ) : (
                <>
                  Todavía no hay con qué comparar: el promedio sale de tus gastos de los últimos{" "}
                  {SPENDING_WINDOW_DAYS} días y aún no hay suficientes. Mientras tanto solo se
                  muestra lo gastado.
                </>
              )}
            </InfoTooltip>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
          <StatTile
            emphasis="quiet"
            label="Promedio por día"
            value={<Money value={perDay} />}
            sub="Según tu historial"
            icon="calendar"
            tone="neutral"
            info={
              <InfoTooltip label="Promedio por día">
                Es lo que gastaste al día en los últimos {SPENDING_WINDOW_DAYS} días, repartido
                entre los días laborables de ese período. No es una meta que configuraste: es tu
                ritmo real de gasto, y se mueve solo conforme gastas.
              </InfoTooltip>
            }
          />
          <StatTile
            emphasis="quiet"
            label="Estimado del mes"
            value={<Money value={estMonth} decimals={false} />}
            sub="Si sigues igual"
            icon="chart"
            tone="neutral"
            info={
              <InfoTooltip label="Estimado del mes">
                Tu promedio por día × {workedMonth} {workedMonth === 1 ? "día" : "días"} laborables
                del mes. Es una proyección de a dónde llegas si sigues gastando como hasta ahora,
                no un límite.
              </InfoTooltip>
            }
          />
        </div>
      </section>

      {/* Ajustes del cálculo: base de días y el presupuesto por categoría.
          Secundarios los dos, sin relleno de marca. */}
      <div className="flex items-center gap-2 mb-5 px-1 flex-wrap">
        <BudgetBasisPicker
          periodKey={q.key}
          periodStart={q.start}
          periodEnd={q.end}
          periodLabel={q.label}
          mode={basis.mode}
          days={basis.days}
          customDays={basis.customDays}
        />
        {(basis.manualCount || basis.mode === "personalizado") && (
          <DeleteButton
            action={clearPeriodOverride.bind(null, q.key)}
            label="Quitar"
            title="¿Volver al conteo automático?"
            message="Se volverá a calcular desde el calendario laboral."
          />
        )}
        <Link
          href="/presupuesto/categorias"
          className="inline-flex items-center gap-1.5 rounded-pill border border-line-strong px-3.5 min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken transition-colors"
        >
          <Icon name="chart" size={16} />
          Presupuesto por categoría
        </Link>
      </div>

      {/* Calculadora independiente: no toca el límite mensual (R07). */}
      <div className="mb-6">
        <DailySpendCalculator />
      </div>

      {/* Cargos fijos: suscripciones activas, visibles aquí solo como
          contexto (se gestionan en Suscripciones, no se duplica el CRUD).
          Colapsado por defecto — el detalle de cada suscripción no es la
          primera lectura de la pantalla de Gastos (Bloque 3); el resumen ya
          adelanta cuánto suman al mes. */}
      {activeSubs.length > 0 && (
        <CollapsibleCard
          className="mb-6"
          title="Cargos fijos"
          summary={
            <>
              {activeSubs.length} {activeSubs.length === 1 ? "activo" : "activos"} ·{" "}
              <Money
                value={activeSubs.reduce(
                  (s, sub) => s + (sub.frequency === "anual" ? Number(sub.amount) / 12 : Number(sub.amount)),
                  0,
                )}
                decimals={false}
              />{" "}
              / mes
            </>
          }
          action={
            <Link href="/suscripciones" className="text-sm font-semibold text-primary-fg">
              Gestionar
            </Link>
          }
        >
          <ul className="flex flex-col gap-2">
            {activeSubs.map((sub) => (
              <li key={sub.id}>
                <Card className="flex items-center gap-3 py-2.5">
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
                </Card>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}

      {/* Gastos reales */}
      <SectionHead title="Gastos reales de la quincena" />

      {expenses.length > 0 && (
        <div className="flex flex-col gap-2.5 mb-3">
          <SearchBar placeholder="Buscar por nota o categoría…" />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {tags.length > 0 && (
              <FilterMenu
                label="Categoría"
                value={
                  tagFilter ? (tags.find((t) => t.id === tagFilter)?.name ?? "Filtrar") : "Todas"
                }
                options={[
                  { label: "Todas las categorías", href: hrefFor({ tag: undefined }), active: !tagFilter },
                  ...tags.map((t) => ({
                    label: t.name,
                    href: hrefFor({ tag: t.id }),
                    active: t.id === tagFilter,
                  })),
                ]}
              />
            )}
            {visibleExpenses.length > 0 && (
              <p className="text-xs text-muted px-1">
                {visibleExpenses.length} · Total{" "}
                <Money value={visibleTotal} decimals={false} className="font-bold text-ink" />
              </p>
            )}
          </div>
        </div>
      )}

      {visibleExpenses.length === 0 && expenses.length === 0 ? (
        <EmptyState
          icon="wallet"
          illustration="target"
          title="Sin gastos aún"
          message="Registra tus gastos reales para compararlos con el presupuesto."
          action={
            <NewExpenseForm tags={tags} rules={rules} accounts={accounts} today={today} triggerLabel="Registrar gasto" />
          }
        />
      ) : visibleExpenses.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Sin resultados"
          message="Ningún gasto coincide con este filtro."
          action={
            <Link href="/presupuesto" className="text-sm font-semibold text-primary-fg">
              Quitar filtros
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groupedExpenses.map((group) => (
            <div key={group.date}>
              <p className="text-xs font-semibold text-muted px-1 mb-2 capitalize">
                {formatDateLong(group.date)}
              </p>
              <ul className="flex flex-col gap-2">
                {group.items.map((e) => {
                  const isDebtPayment = e.source === "debt_payment";
                  const label = isDebtPayment ? "Pago de deuda" : tagName(e.tag_id);
                  return (
                    <li key={e.id}>
                      {/* El MONTO estaba a la izquierda, en el sitio del
                          título, y la categoría era un Badge intercalado: en
                          una columna de gastos las cifras no quedaban
                          alineadas entre sí. Ahora la fila se lee igual que
                          en Movimientos: concepto a la izquierda, cifra
                          alineada a la derecha. */}
                      <Card className="flex items-center gap-3 py-3">
                        <IconBubble
                          icon={isDebtPayment ? "debt" : "wallet"}
                          tone={isDebtPayment ? "warning" : "expense"}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">
                            {e.note || label}
                          </p>
                          {e.note && <p className="text-xs text-muted truncate">{label}</p>}
                        </div>
                        <p className="text-sm font-bold text-expense tabular shrink-0 text-right">
                          −<Money value={Number(e.amount)} />
                        </p>
                        {/* Los pagos de deuda se desmarcan desde Deudas (así
                         *  se limpia también la cuota y el movimiento del
                         *  ledger juntos) — borrarlos solo de acá los dejaría
                         *  desincronizados. */}
                        {!isDebtPayment && (
                          <DeleteButton
                            action={deleteExpense.bind(null, e.id)}
                            undoAction={undoDelete}
                            title="¿Eliminar gasto?"
                            message="Se quitará del historial de gastos."
                          />
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
