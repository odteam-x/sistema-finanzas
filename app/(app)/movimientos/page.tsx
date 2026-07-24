import Link from "next/link";
import { getSavingsAccounts, getSavingsMovements } from "@/lib/data";
import { runSubscriptionCatchUp } from "@/lib/subscriptions";
import { runSalaryCatchUp } from "@/lib/salary";
import { formatDateLong, formatDateShort, todayISO } from "@/lib/format";
import { groupByDate } from "@/lib/group";
import { isExpense, isIncome } from "@/lib/balances";
import { RANGE_LABEL, parseRangePreset, rangeBounds, type RangePreset } from "@/lib/range";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon } from "@/components/ui/Icon";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Money } from "@/components/ui/Money";
import { SearchBar } from "@/components/ui/SearchBar";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { addMovement, deleteMovement } from "../balance/actions";
import type { MovementSource, SavingsAccount } from "@/lib/types";

export const metadata = { title: "Movimientos · Cachin'" };

const sourceLabel: Record<MovementSource, string> = {
  manual: "Manual",
  salary: "Sueldo",
  subscription: "Suscripción",
  debt_payment: "Deuda",
  goal_contribution: "Meta",
  receivable_collected: "Cobro",
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
      <Field label="Tipo" htmlFor="mv-kind">
        <Select id="mv-kind" name="kind" defaultValue="retiro">
          <option value="deposito">Ingreso</option>
          <option value="retiro">Gasto</option>
        </Select>
      </Field>
      <Field label="Monto" htmlFor="mv-amount" required>
        <MoneyInput id="mv-amount" name="amount" required />
      </Field>
      <Field label="Fecha" htmlFor="mv-date" required>
        <Input id="mv-date" name="date" type="date" defaultValue={today} required />
      </Field>
      <Field label="Cuenta" htmlFor="mv-account" required>
        <Select id="mv-account" name="account_id" required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nota" htmlFor="mv-note">
        <Input id="mv-note" name="note" placeholder="Opcional" />
      </Field>
    </FormModal>
  );
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; range?: string; q?: string }>;
}) {
  await Promise.all([runSubscriptionCatchUp(), runSalaryCatchUp()]);

  const sp = await searchParams;
  const kindFilter = sp.tipo === "ingresos" ? "deposito" : sp.tipo === "gastos" ? "retiro" : null;
  const range = parseRangePreset(sp.range);
  const { from, to } = rangeBounds(range);
  const search = (sp.q ?? "").trim().toLowerCase();
  const today = todayISO();
  const [movements, accounts] = await Promise.all([getSavingsMovements(from, to), getSavingsAccounts()]);
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "Cuenta";

  const visible = movements
    .filter((m) => !kindFilter || m.kind === kindFilter)
    .filter((m) => !search || (m.note ?? "").toLowerCase().includes(search) || accountName(m.account_id).toLowerCase().includes(search));

  const filterLabel =
    sp.tipo === "ingresos" ? "Ingresos" : sp.tipo === "gastos" ? "Gastos" : "Todos";

  // Las transferencias entre cuentas propias no son ingreso ni gasto (el
  // dinero no entró ni salió del sistema), así que no inflan estos totales.
  const totalIngresos = visible.filter(isIncome).reduce((s, m) => s + Number(m.amount), 0);
  const totalEgresos = visible.filter(isExpense).reduce((s, m) => s + Number(m.amount), 0);
  const total = totalIngresos - totalEgresos;
  const grouped = groupByDate(visible, (m) => m.date);

  function hrefFor(next: { tipo?: string; range?: RangePreset }) {
    const params = new URLSearchParams();
    const tipo = next.tipo ?? sp.tipo;
    const r = next.range ?? range;
    if (tipo) params.set("tipo", tipo);
    if (r !== "todo") params.set("range", r);
    if (sp.q) params.set("q", sp.q);
    const qs = params.toString();
    return qs ? `/movimientos?${qs}` : "/movimientos";
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle="Todo lo que entra y sale de tus cuentas"
        action={<NewMovementForm accounts={accounts} today={today} triggerLabel="Movimiento" trigger="pill" />}
      />

      {movements.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          <SearchBar placeholder="Buscar por nota o cuenta…" />
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger className="glass inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold text-ink cursor-pointer">
                <Icon name="chevronDown" size={14} />
                {filterLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href={hrefFor({ tipo: undefined })}>Todos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={hrefFor({ tipo: "ingresos" })}>Ingresos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={hrefFor({ tipo: "gastos" })}>Gastos</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="glass inline-flex gap-1 rounded-2xl p-1">
              {(Object.keys(RANGE_LABEL) as RangePreset[]).map((r) => (
                <Link
                  key={r}
                  href={hrefFor({ range: r })}
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors ${
                    r === range ? "bg-primary text-white" : "text-ink/70"
                  }`}
                >
                  {RANGE_LABEL[r]}
                </Link>
              ))}
            </div>
          </div>
          {visible.length > 0 && (
            <p className="text-xs text-muted px-1">
              {visible.length} {visible.length === 1 ? "movimiento" : "movimientos"} · Neto{" "}
              <Money value={total} decimals={false} className="font-semibold text-ink" />
            </p>
          )}
        </div>
      )}

      {visible.length === 0 && movements.length === 0 ? (
        <EmptyState
          icon="movements"
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
            <Link href="/movimientos" className="text-sm font-semibold text-primary">
              Quitar filtros
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((group) => (
            <div key={group.date}>
              <p className="text-xs font-semibold text-muted px-1 mb-1.5 capitalize">
                {formatDateLong(group.date)}
              </p>
              <ul className="flex flex-col gap-2">
                {group.items.map((m) => {
                  const isDep = m.kind === "deposito";
                  const isTransfer = m.kind === "transferencia";
                  const standalone = m.source === "manual" && !m.source_ref_id;
                  return (
                    <li key={m.id}>
                      <GlassCard className="flex items-center gap-3 py-2.5">
                        <IconBubble
                          icon={isTransfer ? "movements" : isDep ? "arrowDownLeft" : "arrowUpRight"}
                          tone={isTransfer ? "info" : isDep ? "neutral" : "danger"}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink truncate">
                            {m.note ?? (isTransfer ? "Transferencia" : isDep ? "Ingreso" : "Gasto")}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {isTransfer && m.to_account_id
                              ? `${accountName(m.account_id)} → ${accountName(m.to_account_id)}`
                              : accountName(m.account_id)}{" "}
                            · {formatDateShort(m.date)}
                          </p>
                        </div>
                        <Badge tone={isTransfer ? "info" : isDep ? "primary" : "neutral"}>
                          {isTransfer ? "Entre cuentas" : sourceLabel[m.source]}
                        </Badge>
                        <p className="font-semibold text-ink shrink-0">
                          {/* Una transferencia no suma ni resta al total: el
                              dinero solo cambió de cuenta. */}
                          {isTransfer ? "" : isDep ? "+" : "−"}
                          <Money value={Number(m.amount)} />
                        </p>
                        {standalone && (
                          <DeleteButton
                            action={deleteMovement.bind(null, m.id)}
                            title="¿Eliminar movimiento?"
                            message="Se recalculará el saldo de la cuenta."
                          />
                        )}
                      </GlassCard>
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
