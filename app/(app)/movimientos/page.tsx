import Link from "next/link";
import {
  getMovementDays,
  getMovementStats,
  getSavingsAccounts,
  getSavingsMovements,
} from "@/lib/data";
import { runSubscriptionCatchUp } from "@/lib/subscriptions";
import { runSalaryCatchUp } from "@/lib/salary";
import { formatDateLong, todayISO } from "@/lib/format";
import { groupByDate } from "@/lib/group";
import { isExpense, isIncome } from "@/lib/balances";
import { RANGE_LABEL, parseRangePreset, rangeBounds, type RangePreset } from "@/lib/range";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon } from "@/components/ui/Icon";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Money } from "@/components/ui/Money";
import { SearchBar } from "@/components/ui/SearchBar";
import { DayPicker } from "@/components/ui/DayPicker";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { ActiveFilters } from "@/components/ui/ActiveFilters";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { addMovement, deleteMovement } from "../balance/actions";
import type { MovementSource, SavingsAccount } from "@/lib/types";
import { undoDelete } from "../undo-actions";

export const metadata = { title: "Movimientos · Cachin'" };

const sourceLabel: Record<MovementSource, string> = {
  manual: "Manual",
  salary: "Sueldo",
  subscription: "Suscripción",
  debt_payment: "Deuda",
  goal_contribution: "Meta",
  receivable_collected: "Cobro",
  debt_disbursement: "Préstamo",
  receivable_disbursement: "Préstamo dado",
};

function NewMovementForm({
  accounts,
  today,
  triggerLabel,
  trigger,
}: {
  accounts: SavingsAccount[];
  today: string;
  triggerLabel: string;
  trigger?: "button" | "link" | "icon" | "pill";
}) {
  return (
    <FormModal
      title="Nuevo movimiento"
      action={addMovement}
      submitLabel="Registrar"
      triggerLabel={triggerLabel}
      trigger={trigger}
    >
      {/* Mismo criterio que el formulario del botón + (QuickForms): decir
          "Ingreso"/"Gasto" a secas repetía las palabras de otras acciones que
          escriben en tablas distintas. Esto ajusta el saldo de una cuenta
          directo en el ledger, sin contar como sueldo ni gasto presupuestado. */}
      <Field
        label="Tipo"
        htmlFor="mv-kind"
        hint="Ajusta el saldo de la cuenta sin contarlo en tu presupuesto."
      >
        <Select id="mv-kind" name="kind" defaultValue="retiro">
          <option value="deposito">Entrada sin categoría</option>
          <option value="retiro">Salida sin categoría</option>
        </Select>
      </Field>
      <Field label="Monto" htmlFor="mv-amount" required>
        <MoneyInput id="mv-amount" name="amount" required />
      </Field>
      <Field label="Fecha" htmlFor="mv-date" required>
        <DateField id="mv-date" name="date" defaultValue={today} required />
      </Field>
      {/* Sin cuentas, un Select vacío y `required` es un callejón sin salida:
          no hay nada que elegir y el formulario no puede enviarse. Se avisa
          en su lugar y se enlaza a donde se resuelve. */}
      {accounts.length > 0 ? (
        <Field label="Cuenta" htmlFor="mv-account" required>
          <Select id="mv-account" name="account_id" required>
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
      <Field label="Nota" htmlFor="mv-note">
        <Input id="mv-note" name="note" placeholder="Opcional" />
      </Field>
    </FormModal>
  );
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; range?: string; q?: string; dia?: string }>;
}) {
  // getSavingsAccounts() no depende de nada que el catch-up escriba (solo
  // lee las cuentas, no su saldo/movimientos) — corre en paralelo con él en
  // vez de esperar a que termine. Los demás datos de abajo SÍ dependen
  // (leen gastos/movimientos recién insertados por el catch-up).
  const [, , accounts] = await Promise.all([
    runSubscriptionCatchUp(),
    runSalaryCatchUp(),
    getSavingsAccounts(),
  ]);

  const sp = await searchParams;
  const kindFilter = sp.tipo === "ingresos" ? "deposito" : sp.tipo === "gastos" ? "retiro" : null;
  const range = parseRangePreset(sp.range);
  // R06: un día específico gana sobre el preset de rango — es el filtro más
  // preciso, no tiene sentido combinarlo con "últimos 3 meses".
  const day = (sp.dia ?? "").trim();
  const bounds = day ? { from: day, to: day } : rangeBounds(range);
  const { from, to } = bounds;
  const search = (sp.q ?? "").trim().toLowerCase();
  const today = todayISO();
  const [movements, stats, availableDays] = await Promise.all([
    getSavingsMovements(from, to),
    // Los totales los suma Postgres con los mismos filtros, no un .reduce()
    // sobre todo el historial traído a memoria.
    getMovementStats({ from, to, kind: kindFilter, search: sp.q ?? "" }),
    // Días que sí tienen movimientos, para acotar el selector de fecha.
    getMovementDays(),
  ]);
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "Cuenta";

  const visible = movements
    .filter((m) => !kindFilter || m.kind === kindFilter)
    .filter((m) => !search || (m.note ?? "").toLowerCase().includes(search) || accountName(m.account_id).toLowerCase().includes(search));

  const filterLabel =
    sp.tipo === "ingresos" ? "Ingresos" : sp.tipo === "gastos" ? "Gastos" : "Todos";

  // Si la RPC no está disponible todavía (migración v12 sin correr), se cae
  // al cálculo en memoria para no romper la pantalla.
  const totalIngresos = stats?.total_ingresos ?? visible.filter(isIncome).reduce((s, m) => s + Number(m.amount), 0);
  const totalEgresos = stats?.total_egresos ?? visible.filter(isExpense).reduce((s, m) => s + Number(m.amount), 0);
  const total = stats?.neto ?? totalIngresos - totalEgresos;
  const grouped = groupByDate(visible, (m) => m.date);

  function hrefFor(next: {
    tipo?: string;
    range?: RangePreset;
    dia?: string | null;
    q?: string | null;
  }) {
    const params = new URLSearchParams();
    // `undefined` = "deja lo que ya había"; `null` = "quita este filtro".
    const tipo = "tipo" in next ? next.tipo : sp.tipo;
    const r = next.range ?? range;
    const d = next.dia === null ? "" : (next.dia ?? day);
    const q = next.q === null ? "" : (next.q ?? sp.q);
    if (tipo) params.set("tipo", tipo);
    if (d) params.set("dia", d);
    else if (r !== "todo") params.set("range", r);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/movimientos?${qs}` : "/movimientos";
  }

  // Lo que el usuario está viendo, dicho con palabras. Antes el subtítulo era
  // siempre "Todo lo que entra y sale de tus cuentas" aunque la lista
  // estuviera recortada a un solo día y a un solo tipo: la pantalla filtrada
  // se leía igual que la pantalla completa.
  const tipoLabel = sp.tipo === "ingresos" ? "Solo ingresos" : sp.tipo === "gastos" ? "Solo gastos" : null;
  const activeFilters = [
    tipoLabel && { label: tipoLabel, removeHref: hrefFor({ tipo: undefined }) },
    day && { label: formatDateLong(day), removeHref: hrefFor({ dia: null }) },
    !day && range !== "todo" && { label: RANGE_LABEL[range], removeHref: hrefFor({ range: "todo" }) },
    sp.q && { label: `“${sp.q}”`, removeHref: hrefFor({ q: null }) },
  ].filter((f): f is { label: string; removeHref: string } => Boolean(f));

  const alcance = day
    ? formatDateLong(day)
    : range === "todo"
      ? "todo tu historial"
      : RANGE_LABEL[range].toLowerCase();

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle={`Viendo ${alcance}${tipoLabel ? ` · ${tipoLabel.toLowerCase()}` : ""}`}
        action={
          /* Dos acciones competían aquí con el mismo peso. "Importar" es
             algo que se hace una vez al mes contra un estado de cuenta;
             registrar un movimiento es lo diario. La primera queda como
             ícono sin relleno, la segunda conserva la píldora. */
          <div className="flex items-center gap-1">
            <Link
              href="/movimientos/importar"
              aria-label="Importar estado de cuenta"
              title="Importar estado de cuenta"
              className="grid place-items-center size-11 rounded-pill text-muted hover:bg-surface-sunken hover:text-ink transition-colors shrink-0"
            >
              <Icon name="bank" size={20} />
            </Link>
            <NewMovementForm accounts={accounts} today={today} triggerLabel="Movimiento" trigger="pill" />
          </div>
        }
      />

      {movements.length > 0 && (
        <>
          <ActiveFilters filters={activeFilters} clearHref="/movimientos" />

          {/* El neto del filtro activo era una línea de texto corrido dentro
              del `summary` de un colapsable: la pantalla no tenía NINGUNA
              cifra dominante. Ahora manda, y los dos totales que lo componen
              quedan debajo, más chicos. */}
          {(stats?.cantidad ?? visible.length) > 0 && (
            <section className="mb-6">
              <StatTile
                emphasis="hero"
                // El label dice SOBRE QUÉ se calculó: "Neto · todo" no decía
                // si eran los 34 movimientos de la lista o los de todo el año.
                label={`Neto de ${alcance}`}
                value={
                  <>
                    {total >= 0 ? "+" : "−"}
                    <Money value={Math.abs(total)} decimals={false} />
                  </>
                }
                sub={`${stats?.cantidad ?? visible.length} ${
                  (stats?.cantidad ?? visible.length) === 1 ? "movimiento" : "movimientos"
                }`}
                icon={total >= 0 ? "trendUp" : "trendDown"}
                tone={total >= 0 ? "income" : "expense"}
              />
              <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                <StatTile
                  emphasis="quiet"
                  label="Entró"
                  value={<Money value={totalIngresos} decimals={false} />}
                  icon="arrowDownLeft"
                  tone="income"
                />
                <StatTile
                  emphasis="quiet"
                  label="Salió"
                  value={<Money value={totalEgresos} decimals={false} />}
                  icon="arrowUpRight"
                  tone="expense"
                />
              </div>
              {stats?.busiest_date && (stats.busiest_count ?? 0) > 0 && (
                <p className="text-xs text-muted mt-2.5 px-1">
                  Día con más movimientos:{" "}
                  <Link
                    href={hrefFor({ dia: stats.busiest_date })}
                    className="font-semibold text-primary-fg"
                  >
                    {formatDateLong(stats.busiest_date)}
                  </Link>{" "}
                  · {stats.busiest_count}{" "}
                  {stats.busiest_count === 1 ? "movimiento" : "movimientos"} · neto{" "}
                  <Money
                    value={stats.busiest_neto ?? 0}
                    decimals={false}
                    className="font-semibold text-ink"
                  />
                </p>
              )}
            </section>
          )}

          {/* Filtros: todos secundarios y del mismo peso. Antes eran cuatro
              grupos con tres tratamientos distintos (dropdown + píldoras
              rellenas + selector de día) y ocupaban casi un viewport
              completo antes de la primera fila de la lista. */}
          <div className="flex flex-col gap-2.5 mb-5">
            <SearchBar placeholder="Buscar por nota o cuenta…" />
            <div className="flex items-center gap-2 flex-wrap">
              <FilterMenu
                label="Tipo"
                value={filterLabel}
                options={[
                  { label: "Todos", href: hrefFor({ tipo: undefined }), active: !sp.tipo },
                  { label: "Ingresos", href: hrefFor({ tipo: "ingresos" }), active: sp.tipo === "ingresos" },
                  { label: "Gastos", href: hrefFor({ tipo: "gastos" }), active: sp.tipo === "gastos" },
                ]}
              />
              <FilterMenu
                label="Rango"
                value={day ? "Un día" : RANGE_LABEL[range]}
                options={(Object.keys(RANGE_LABEL) as RangePreset[]).map((r) => ({
                  label: RANGE_LABEL[r],
                  href: hrefFor({ range: r, dia: null }),
                  active: !day && r === range,
                }))}
              />
              {/* R06: ver un solo día. Gana sobre el preset de rango. */}
              <DayPicker value={day} availableDays={availableDays} />
            </div>
            {/* El aviso propio del filtro por día se retiró: ActiveFilters ya
                anuncia TODOS los filtros puestos arriba, con su salida. Tener
                dos avisos distintos para el mismo estado era parte de por qué
                no quedaba claro qué recortaba la lista. */}
          </div>
        </>
      )}

      {visible.length === 0 && movements.length === 0 ? (
        <EmptyState
          icon="movements"
          illustration="finance"
          title="Sin movimientos"
          message="Registra un ingreso, un gasto o un movimiento manual para verlo aquí."
          action={<NewMovementForm accounts={accounts} today={today} triggerLabel="Registrar movimiento" />}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="movements"
          title="Sin resultados"
          message="Ningún movimiento coincide con este filtro."
          action={
            <Link href="/movimientos" className="text-sm font-semibold text-primary-fg">
              Quitar filtros
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map((group) => (
            <div key={group.date}>
              <p className="text-xs font-semibold text-muted px-1 mb-2 capitalize">
                {formatDateLong(group.date)}
              </p>
              <ul className="flex flex-col gap-2">
                {group.items.map((m) => {
                  const isDep = m.kind === "deposito";
                  const isTransfer = m.kind === "transferencia";
                  const standalone = m.source === "manual" && !m.source_ref_id;
                  return (
                    <li key={m.id}>
                      {/* El Badge estaba INTERCALADO entre el texto y el
                          monto, así que la cifra bailaba de posición según lo
                          largo de la etiqueta y nunca quedaba alineada con
                          las de arriba y abajo. Ahora baja a la línea de
                          metadatos y el monto es el último elemento: columna
                          derecha fija, tabular, con el color de dirección. */}
                      <Card className="flex items-center gap-3 py-3">
                        <IconBubble
                          icon={isTransfer ? "movements" : isDep ? "arrowDownLeft" : "arrowUpRight"}
                          tone={isTransfer ? "info" : isDep ? "income" : "expense"}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">
                            {m.note ?? (isTransfer ? "Transferencia" : isDep ? "Ingreso" : "Gasto")}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {isTransfer && m.to_account_id
                              ? `${accountName(m.account_id)} → ${accountName(m.to_account_id)}`
                              : accountName(m.account_id)}
                            {" · "}
                            {isTransfer ? "Entre cuentas" : sourceLabel[m.source]}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-sm font-bold tabular shrink-0 text-right",
                            // Una transferencia no suma ni resta al total: el
                            // dinero solo cambió de cuenta, así que tampoco
                            // lleva color de dirección.
                            isTransfer ? "text-muted" : isDep ? "text-income" : "text-expense",
                          )}
                        >
                          {isTransfer ? "" : isDep ? "+" : "−"}
                          <Money value={Number(m.amount)} />
                        </p>
                        {standalone && (
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
            </div>
          ))}
        </div>
      )}
    </>
  );
}
