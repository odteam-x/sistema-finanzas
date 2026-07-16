import Link from "next/link";
import { getSavingsAccounts, getSavingsMovements } from "@/lib/data";
import { runSubscriptionCatchUp } from "@/lib/subscriptions";
import { runSalaryCatchUp } from "@/lib/salary";
import { formatDateShort, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon } from "@/components/ui/Icon";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Money } from "@/components/ui/Money";
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
};

function NewMovementForm({
  accounts,
  today,
  triggerLabel,
}: {
  accounts: SavingsAccount[];
  today: string;
  triggerLabel: string;
}) {
  return (
    <FormModal title="Nuevo movimiento" action={addMovement} submitLabel="Registrar" triggerLabel={triggerLabel}>
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
  searchParams: Promise<{ tipo?: string }>;
}) {
  await Promise.all([runSubscriptionCatchUp(), runSalaryCatchUp()]);

  const sp = await searchParams;
  const kindFilter = sp.tipo === "ingresos" ? "deposito" : sp.tipo === "gastos" ? "retiro" : null;
  const today = todayISO();
  const [movements, accounts] = await Promise.all([getSavingsMovements(), getSavingsAccounts()]);
  const visible = kindFilter ? movements.filter((m) => m.kind === kindFilter) : movements;
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "Cuenta";

  const filterLabel =
    sp.tipo === "ingresos" ? "Ingresos" : sp.tipo === "gastos" ? "Gastos" : "Todos";

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle="Todo lo que entra y sale de tus cuentas"
        action={<NewMovementForm accounts={accounts} today={today} triggerLabel="Movimiento" />}
      />

      {movements.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="glass inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold text-ink cursor-pointer">
              <Icon name="chevronDown" size={14} />
              {filterLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/movimientos">Todos</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/movimientos?tipo=ingresos">Ingresos</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/movimientos?tipo=gastos">Gastos</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon="movements"
          title="Sin movimientos"
          message="Registra un ingreso, un gasto o un movimiento manual para verlo aquí."
          action={<NewMovementForm accounts={accounts} today={today} triggerLabel="Registrar movimiento" />}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((m) => {
            const isDep = m.kind === "deposito";
            const standalone = m.source === "manual" && !m.source_ref_id;
            return (
              <li key={m.id}>
                <GlassCard className="flex items-center gap-3 py-2.5">
                  <IconBubble
                    icon={isDep ? "arrowDownLeft" : "arrowUpRight"}
                    tone={isDep ? "neutral" : "danger"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink truncate">
                      {m.note ?? (isDep ? "Ingreso" : "Gasto")}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {accountName(m.account_id)} · {formatDateShort(m.date)}
                    </p>
                  </div>
                  <Badge tone={isDep ? "primary" : "neutral"}>{sourceLabel[m.source]}</Badge>
                  <p className="font-semibold text-ink shrink-0">
                    {isDep ? "+" : "−"}
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
      )}
    </>
  );
}
