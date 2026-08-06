// La tarjeta de un acreedor con todas sus deudas. Vive en su propio archivo
// porque la comparten dos pantallas — /deudas (pendientes) y /deudas/historial
// (saldadas) — y mantenerla duplicada garantizaba que las dos se
// desincronizaran a la primera corrección.
//
// Sigue siendo un componente de SERVIDOR: compone piezas de cliente
// (FormModal, DeleteButton, InstallmentList) y les pasa server actions, igual
// que hacía dentro de page.tsx. No necesita una prop `readOnly` para el
// historial: cada deuda ya decide sola con `settled` si muestra editar y
// aumentar o el botón de reabrir.
import { isSettled, outstandingOfDebt, totalOfDebt } from "@/lib/debts";
import { formatDateLong } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Money } from "@/components/ui/Money";
import { Field, Input, MoneyInput, Select } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { InstallmentList, DebtPaidToggle } from "./DebtControls";
import { AddIncrementButton, IncrementHistory, ReopenDebtButton } from "./DebtActions";
import { deleteDebt, updateDebt } from "./actions";
import type {
  Creditor,
  Debt,
  DebtIncrement,
  DebtInstallment,
  DebtStatus,
  SavingsAccount,
} from "@/lib/types";

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

/** ¿Esta deuda está vencida? Pago único: su propia fecha ya pasó y no está
 *  pagada. En cuotas: la próxima cuota sin pagar ya venció — mismo criterio
 *  que ya usa InstallmentRow (DebtControls.tsx) por cuota individual, acá a
 *  nivel de deuda/grupo para el badge que si no se vería igual a "Pendiente". */
function isOverdue(
  d: Debt,
  installmentsOf: { due_date: string; paid: boolean }[],
  today: string,
): boolean {
  if (d.status === "pagada") return false;
  if (d.payment_type === "unico") return !!d.due_date && d.due_date < today;
  const next = installmentsOf.find((i) => !i.paid);
  return !!next && next.due_date < today;
}

function EditDebtForm({ debt, creditors }: { debt: Debt; creditors: Creditor[] }) {
  return (
    <FormModal
      title="Editar deuda"
      action={updateDebt}
      submitLabel="Guardar deuda"
      trigger="icon"
      triggerIcon="edit"
      triggerAriaLabel={`Editar ${debt.name}`}
    >
      <input type="hidden" name="id" value={debt.id} />
      {/* Desde acá se mueve la deuda entre acreedores que ya existen; para
          crear uno nuevo está el formulario de nueva deuda. FormModal recibe
          children serializables desde un componente de servidor y no admite
          campos que aparezcan según lo elegido. */}
      {creditors.length > 0 && (
        <Field label="Acreedor" htmlFor={`edc-${debt.id}`} required>
          <Select
            id={`edc-${debt.id}`}
            name="creditor_id"
            defaultValue={debt.creditor_id ?? creditors[0].id}
          >
            {creditors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field
        label="Descripción"
        htmlFor={`edn-${debt.id}`}
        hint="Opcional. Útil si le debes varias cosas al mismo acreedor."
      >
        <Input id={`edn-${debt.id}`} name="name" defaultValue={debt.name} />
      </Field>
      {debt.payment_type === "unico" ? (
        <>
          <Field
            label="Monto total"
            htmlFor={`eda-${debt.id}`}
            required
            hint="Súmale si te prestaron más, o ajústalo si pagaste distinto."
          >
            <MoneyInput
              id={`eda-${debt.id}`}
              name="total_amount"
              defaultValue={String(debt.total_amount)}
              required
            />
          </Field>
          <Field label="Fecha de pago" htmlFor={`edd-${debt.id}`} hint="Aplázala si necesitas más tiempo.">
            <DateField id={`edd-${debt.id}`} name="due_date" defaultValue={debt.due_date ?? ""} />
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

export function DebtGroupCard({
  name,
  debts,
  installments,
  increments,
  accounts,
  creditors = [],
  today,
}: {
  name: string;
  debts: Debt[];
  installments: DebtInstallment[];
  increments: DebtIncrement[];
  accounts: SavingsAccount[];
  creditors?: Creditor[];
  today: string;
}) {
  const insOf = (debtId: string) =>
    installments.filter((i) => i.debt_id === debtId).sort((a, b) => a.seq - b.seq);
  const incsOf = (debtId: string) => increments.filter((i) => i.debt_id === debtId);
  const groupOutstanding = debts.reduce(
    (s, d) => s + outstandingOfDebt(d, installments, increments),
    0,
  );
  const groupPaid = debts.every((d) => isSettled(d, installments, increments));

  return (
    <Card>
      <div className="flex items-start gap-3">
        <IconBubble icon="debt" tone={groupPaid ? "brand" : "warning"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-bold text-ink truncate min-w-0">{name}</p>
            {debts.length > 1 && (
              <Badge tone="neutral" className="shrink-0">
                {debts.length} deudas
              </Badge>
            )}
          </div>
          <p className="text-sm text-ink font-semibold mt-0.5">
            <Money value={groupOutstanding} /> {groupOutstanding > 0 ? "pendiente" : "al día"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-line">
        {debts.map((d) => {
          const ins = insOf(d.id);
          const paidCount = ins.filter((i) => i.paid).length;
          const incs = incsOf(d.id);
          const total = totalOfDebt(d, increments);
          const settled = isSettled(d, installments, increments);
          const overdue = isOverdue(d, ins, today);
          return (
            <div key={d.id} className="pt-3 first:pt-0 pb-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Badge tone={overdue ? "danger" : statusTone[d.status]} className="shrink-0">
                      {overdue ? "Vencida" : statusLabel[d.status]}
                    </Badge>
                    <p className="text-sm font-semibold text-ink truncate">
                      <Money value={total} />
                    </p>
                    <Badge tone="neutral" className="shrink-0">
                      {d.kind === "prestamo" ? "Recibí el dinero" : "A crédito"}
                    </Badge>
                    {settled && (
                      <Badge tone="neutral" className="shrink-0">
                        Solo lectura
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Adquirida el {formatDateLong(d.acquired_date)}
                    {d.note ? ` · ${d.note}` : ""}
                  </p>
                  <IncrementHistory originalAmount={Number(d.total_amount)} increments={incs} />
                  {/* R03: liquidada = inmutable. Reabrir (que revierte el
                      último pago) es la única forma de editarla. */}
                  {settled && (
                    <div className="mt-2">
                      <ReopenDebtButton debtId={d.id} debtName={d.name} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!settled && <AddIncrementButton debtId={d.id} today={today} />}
                  {!settled && <EditDebtForm debt={d} creditors={creditors} />}
                  <DeleteButton
                    action={deleteDebt.bind(null, d.id)}
                    title="¿Eliminar deuda?"
                    message="Se eliminará la deuda y sus cuotas. Los pagos que ya hiciste se conservan como movimientos manuales — tu balance no cambia."
                  />
                </div>
              </div>

              {d.payment_type === "cuotas" ? (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-muted mb-1">
                    Cuotas pagadas: {paidCount}/{ins.length}
                    {d.frequency ? ` · ${d.frequency}` : ""}
                  </p>
                  <InstallmentList installments={ins} today={today} accounts={accounts} />
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-xs text-muted mb-1">
                    {d.due_date ? `Vence el ${formatDateLong(d.due_date)}` : "Sin fecha de pago"}
                  </p>
                  <DebtPaidToggle id={d.id} paid={d.status === "pagada"} accounts={accounts} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
