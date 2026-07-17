import { getDebts, getInstallments } from "@/lib/data";
import {
  formatDateLong,
  formatDateShort,
  todayISO,
  daysBetween,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Money } from "@/components/ui/Money";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { AddDebtForm } from "./AddDebtForm";
import { InstallmentRow, DebtPaidToggle } from "./DebtControls";
import { deleteDebt, updateDebt } from "./actions";
import type { Debt, DebtStatus } from "@/lib/types";

export const metadata = { title: "Deudas · Cachin'" };

const statusTone: Record<DebtStatus, "warning" | "info" | "success"> = {
  pendiente: "warning",
  parcial: "info",
  pagada: "success",
};
const statusLabel: Record<DebtStatus, string> = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagada: "Pagada",
};

function EditDebtForm({ debt }: { debt: Debt }) {
  return (
    <FormModal
      title="Editar deuda"
      action={updateDebt}
      submitLabel="Guardar"
      trigger="icon"
      triggerIcon="edit"
      triggerAriaLabel={`Editar ${debt.name}`}
    >
      <input type="hidden" name="id" value={debt.id} />
      <Field label="Acreedor / nombre" htmlFor={`edn-${debt.id}`} required>
        <Input id={`edn-${debt.id}`} name="name" defaultValue={debt.name} required />
      </Field>
      {debt.payment_type === "unico" ? (
        <>
          <Field
            label="Monto total"
            htmlFor={`eda-${debt.id}`}
            required
            hint="Súmale si te prestaron más, o ajústalo si pagaste distinto."
          >
            <MoneyInput id={`eda-${debt.id}`} name="total_amount" defaultValue={String(debt.total_amount)} required />
          </Field>
          <Field label="Fecha de pago" htmlFor={`edd-${debt.id}`} hint="Aplázala si necesitas más tiempo.">
            <Input id={`edd-${debt.id}`} name="due_date" type="date" defaultValue={debt.due_date ?? ""} />
          </Field>
        </>
      ) : (
        <input type="hidden" name="total_amount" value={String(debt.total_amount)} />
      )}
      <Field label="Nota" htmlFor={`edno-${debt.id}`}>
        <Input id={`edno-${debt.id}`} name="note" defaultValue={debt.note ?? ""} placeholder="Opcional" />
      </Field>
    </FormModal>
  );
}

export default async function DeudasPage() {
  const today = todayISO();
  const [debts, installments] = await Promise.all([
    getDebts(),
    getInstallments(),
  ]);

  const byDebt = new Map<string, typeof installments>();
  for (const i of installments) {
    const arr = byDebt.get(i.debt_id) ?? [];
    arr.push(i);
    byDebt.set(i.debt_id, arr);
  }

  // Total adeudado + próximo vencimiento
  let outstanding = 0;
  const upcoming: string[] = [];
  for (const d of debts) {
    if (d.payment_type === "cuotas") {
      const ins = byDebt.get(d.id) ?? [];
      for (const i of ins) {
        if (!i.paid) {
          outstanding += Number(i.amount);
          upcoming.push(i.due_date);
        }
      }
    } else if (d.status !== "pagada") {
      outstanding += Number(d.total_amount);
      if (d.due_date) upcoming.push(d.due_date);
    }
  }
  upcoming.sort();
  const nextDue = upcoming[0] ?? null;

  // Agrupadas por acreedor: el mismo nombre puede tener varias deudas
  // (ej. dos préstamos distintos con la misma persona/entidad).
  const groups = new Map<string, typeof debts>();
  for (const d of debts) {
    const arr = groups.get(d.name) ?? [];
    arr.push(d);
    groups.set(d.name, arr);
  }
  const outstandingOf = (d: (typeof debts)[number]) => {
    if (d.payment_type === "cuotas") {
      return (byDebt.get(d.id) ?? []).filter((i) => !i.paid).reduce((s, i) => s + Number(i.amount), 0);
    }
    return d.status !== "pagada" ? Number(d.total_amount) : 0;
  };
  const isPaid = (d: (typeof debts)[number]) => {
    if (d.payment_type === "cuotas") {
      const ins = byDebt.get(d.id) ?? [];
      return ins.length > 0 && ins.every((i) => i.paid);
    }
    return d.status === "pagada";
  };

  return (
    <>
      <PageHeader
        title="Deudas"
        subtitle="Acreedores, cuotas y vencimientos"
        action={<AddDebtForm compact />}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatTile
          label="Total adeudado"
          value={<Money value={outstanding} decimals={false} />}
          icon="debt"
          tone={outstanding > 0 ? "danger" : "primary"}
        />
        <StatTile
          label="Próximo vencimiento"
          value={nextDue ? formatDateShort(nextDue) : "—"}
          sub={
            nextDue
              ? (() => {
                  const d = daysBetween(today, nextDue);
                  return d < 0 ? "vencido" : d === 0 ? "hoy" : `en ${d} días`;
                })()
              : "Sin deudas activas"
          }
          icon="clock"
          tone="neutral"
        />
      </div>

      {debts.length === 0 ? (
        <EmptyState
          icon="debt"
          title="Sin deudas registradas"
          message="Registra una deuda para llevar control de sus pagos y vencimientos."
          action={<AddDebtForm triggerLabel="Registrar deuda" />}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {Array.from(groups.entries()).map(([name, group]) => {
            const groupOutstanding = group.reduce((s, d) => s + outstandingOf(d), 0);
            const groupPaid = group.every(isPaid);
            return (
              <li key={name}>
                <GlassCard>
                  <div className="flex items-start gap-3">
                    <IconBubble icon="debt" tone={groupPaid ? "brand" : "warning"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-ink truncate min-w-0">{name}</p>
                        {group.length > 1 && (
                          <Badge tone="neutral" className="shrink-0">
                            {group.length} deudas
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-ink font-semibold mt-0.5">
                        <Money value={groupOutstanding} /> {groupOutstanding > 0 ? "pendiente" : "al día"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col divide-y divide-black/5">
                    {group.map((d) => {
                      const ins = (byDebt.get(d.id) ?? []).sort((a, b) => a.seq - b.seq);
                      const paidCount = ins.filter((i) => i.paid).length;
                      return (
                        <div key={d.id} className="pt-3 first:pt-0 pb-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge tone={statusTone[d.status]} className="shrink-0">
                                  {statusLabel[d.status]}
                                </Badge>
                                <p className="text-sm font-semibold text-ink truncate">
                                  <Money value={Number(d.total_amount)} />
                                </p>
                              </div>
                              <p className="text-xs text-muted mt-0.5">
                                Adquirida el {formatDateLong(d.acquired_date)}
                                {d.note ? ` · ${d.note}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <EditDebtForm debt={d} />
                              <DeleteButton
                                action={deleteDebt.bind(null, d.id)}
                                title="¿Eliminar deuda?"
                                message="Se eliminará la deuda y sus cuotas."
                              />
                            </div>
                          </div>

                          {d.payment_type === "cuotas" ? (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-muted mb-1">
                                Cuotas pagadas: {paidCount}/{ins.length}
                                {d.frequency ? ` · ${d.frequency}` : ""}
                              </p>
                              <div className="flex flex-col divide-y divide-black/5">
                                {ins.map((i) => (
                                  <InstallmentRow
                                    key={i.id}
                                    installment={i}
                                    overdue={daysBetween(today, i.due_date) < 0}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2">
                              <p className="text-xs text-muted mb-1">
                                {d.due_date
                                  ? `Vence el ${formatDateLong(d.due_date)}`
                                  : "Sin fecha de pago"}
                              </p>
                              <DebtPaidToggle id={d.id} paid={d.status === "pagada"} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
