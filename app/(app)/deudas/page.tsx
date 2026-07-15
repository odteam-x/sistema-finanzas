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
import { AddDebtForm } from "./AddDebtForm";
import { InstallmentRow, DebtPaidToggle } from "./DebtControls";
import { deleteDebt } from "./actions";
import type { DebtStatus } from "@/lib/types";

export const metadata = { title: "Deudas · Bolsillo Seguro" };

const statusTone: Record<DebtStatus, "warning" | "info" | "success"> = {
  pendiente: "warning",
  parcial: "info",
  pagada: "success",
};
const statusBubbleTone: Record<DebtStatus, "warning" | "info" | "brand"> = {
  pendiente: "warning",
  parcial: "info",
  pagada: "brand",
};
const statusLabel: Record<DebtStatus, string> = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagada: "Pagada",
};

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

  return (
    <>
      <PageHeader
        title="Deudas"
        subtitle="Acreedores, cuotas y vencimientos"
        action={<AddDebtForm />}
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
          {debts.map((d) => {
            const ins = (byDebt.get(d.id) ?? []).sort((a, b) => a.seq - b.seq);
            const paidCount = ins.filter((i) => i.paid).length;
            return (
              <li key={d.id}>
                <GlassCard>
                  <div className="flex items-start gap-3">
                    <IconBubble icon="debt" tone={statusBubbleTone[d.status]} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-ink truncate min-w-0">{d.name}</p>
                        <Badge tone={statusTone[d.status]} className="shrink-0">
                          {statusLabel[d.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-ink font-semibold mt-0.5">
                        <Money value={Number(d.total_amount)} />
                      </p>
                      <p className="text-xs text-muted">
                        Adquirida el {formatDateLong(d.acquired_date)}
                        {d.note ? ` · ${d.note}` : ""}
                      </p>
                    </div>
                    <DeleteButton
                      action={deleteDebt.bind(null, d.id)}
                      title="¿Eliminar deuda?"
                      message="Se eliminará la deuda y sus cuotas."
                    />
                  </div>

                  {d.payment_type === "cuotas" ? (
                    <div className="mt-3 pt-3 border-t border-black/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-muted">
                          Cuotas pagadas: {paidCount}/{ins.length}
                          {d.frequency ? ` · ${d.frequency}` : ""}
                        </p>
                      </div>
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
                    <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted">
                        {d.due_date
                          ? `Vence el ${formatDateLong(d.due_date)}`
                          : "Sin fecha de pago"}
                      </p>
                      <DebtPaidToggle id={d.id} paid={d.status === "pagada"} />
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
