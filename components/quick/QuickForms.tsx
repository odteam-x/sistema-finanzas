"use client";

import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { addExpense } from "@/app/(app)/presupuesto/actions";
import { addSalary } from "@/app/(app)/ingresos/actions";
import { addMovement } from "@/app/(app)/balance/actions";
import { addDebt } from "@/app/(app)/deudas/actions";
import type { ReceiptData } from "@/components/ui/Receipt";
import { todayISO, formatDOP, formatDateLong } from "@/lib/format";
import { parseAmount, type ActionResult } from "@/lib/actions-shared";
import { submitOfflineAware } from "@/lib/offlineQueue";

export type QuickForm = "gasto" | "ingreso" | "movimiento" | "deuda" | null;

/** Lo mínimo que estos formularios necesitan de una cuenta. Deliberadamente
 *  más laxo que `SavingsAccount`: el hero del Inicio ya tiene los saldos
 *  calculados (AccountBalance) y no debería pedir la fila completa otra vez
 *  solo para llenar un <select>. */
export interface QuickAccount {
  id: string;
  name: string;
}

// Los 3 formularios "sobre la marcha" pasan por la cola offline-first
// (lib/offlineQueue.ts) — si no hay red, se encolan en vez de fallar. "Nueva
// deuda" queda fuera de ese alcance: registrar una deuda no es un caso de
// "estoy en la calle sin señal" tan frecuente como estos 3.
export function submitGasto(formData: FormData): Promise<ActionResult> {
  const amount = parseAmount(formData.get("amount"));
  return submitOfflineAware("gasto", addExpense, formData, `Gasto · ${formatDOP(amount || 0, false)}`);
}

export function submitIngreso(formData: FormData): Promise<ActionResult> {
  const amount = parseAmount(formData.get("amount"));
  return submitOfflineAware("ingreso", addSalary, formData, `Ingreso · ${formatDOP(amount || 0, false)}`);
}

export function submitMovimiento(formData: FormData): Promise<ActionResult> {
  const amount = parseAmount(formData.get("amount"));
  const isDeposito = String(formData.get("kind") ?? "") === "deposito";
  return submitOfflineAware(
    "movimiento",
    addMovement,
    formData,
    `${isDeposito ? "Ingreso" : "Gasto"} · ${formatDOP(amount || 0, false)}`,
  );
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  banco: "Depósito / transferencia",
  tarjeta_debito: "Tarjeta débito",
  tarjeta_credito: "Tarjeta crédito",
};

/** Filas del recibo, saltando las que el usuario dejó vacías: un recibo con
 *  "Nota: —" no informa de nada. */
function rows(...pairs: [string, string | null | undefined][]) {
  return pairs
    .filter((p): p is [string, string] => Boolean(p[1]))
    .map(([label, value]) => ({ label, value }));
}

function fieldText(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/** Los 4 formularios de registro rápido, sin disparador propio: quien los
 *  monta decide cuándo abrirse (el FAB de la barra inferior y la fila de
 *  acciones rápidas del Inicio los comparten). Antes vivían dentro de
 *  QuickAddFab, así que la fila del hero habría tenido que duplicarlos
 *  —y con ellos la lógica de cola offline— para ofrecer los mismos atajos. */
export function QuickForms({
  accounts,
  active,
  onClose,
  idPrefix = "qa",
}: {
  accounts: QuickAccount[];
  active: QuickForm;
  onClose: () => void;
  /** Distingue los ids de los campos cuando hay dos juegos montados a la vez
   *  (Inicio monta el del hero y el del FAB en el mismo árbol). */
  idPrefix?: string;
}) {
  const today = todayISO();
  const close = (open: boolean) => {
    if (!open) onClose();
  };
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name;

  const gastoReceipt = (fd: FormData, queued: boolean): ReceiptData => ({
    title: "Gasto registrado",
    amount: `−${formatDOP(parseAmount(fd.get("amount")) ?? 0)}`,
    direction: "out",
    queued,
    rows: rows(
      ["Fecha", formatDateLong(fieldText(fd, "date"))],
      ["Cuenta", accountName(fieldText(fd, "account_id")) ?? "Sin asociar"],
      ["Nota", fieldText(fd, "note")],
    ),
  });

  const ingresoReceipt = (fd: FormData, queued: boolean): ReceiptData => ({
    title: "Ingreso registrado",
    amount: `+${formatDOP(parseAmount(fd.get("amount")) ?? 0)}`,
    direction: "in",
    queued,
    rows: rows(
      ["Fecha del pago", formatDateLong(fieldText(fd, "pay_date"))],
      [
        "Entra a",
        accountName(fieldText(fd, "account_id")) ??
          PAYMENT_METHOD_LABEL[fieldText(fd, "payment_method")],
      ],
      ["Nota", fieldText(fd, "note")],
    ),
  });

  const movimientoReceipt = (fd: FormData, queued: boolean): ReceiptData => {
    const isDeposito = fieldText(fd, "kind") === "deposito";
    return {
      title: "Movimiento registrado",
      amount: `${isDeposito ? "+" : "−"}${formatDOP(parseAmount(fd.get("amount")) ?? 0)}`,
      direction: isDeposito ? "in" : "out",
      queued,
      rows: rows(
        ["Tipo", isDeposito ? "Ingreso" : "Gasto"],
        ["Fecha", formatDateLong(fieldText(fd, "date"))],
        ["Cuenta", accountName(fieldText(fd, "account_id"))],
        ["Nota", fieldText(fd, "note")],
      ),
    };
  };

  return (
    <>
      <FormModal
        title="Registrar gasto"
        action={submitGasto}
        submitLabel="Registrar"
        receipt={gastoReceipt}
        hideTrigger
        open={active === "gasto"}
        onOpenChange={close}
      >
        <Field label="Monto" htmlFor={`${idPrefix}-exp-amount`} required>
          <MoneyInput id={`${idPrefix}-exp-amount`} name="amount" required />
        </Field>
        <Field label="Fecha" htmlFor={`${idPrefix}-exp-date`} required>
          <DateField id={`${idPrefix}-exp-date`} name="date" defaultValue={today} required />
        </Field>
        {accounts.length > 0 && (
          <Field label="Cuenta" htmlFor={`${idPrefix}-exp-account`} hint="De dónde sale el dinero.">
            <Select id={`${idPrefix}-exp-account`} name="account_id" defaultValue="">
              <option value="">Sin asociar</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nota" htmlFor={`${idPrefix}-exp-note`}>
          <Input id={`${idPrefix}-exp-note`} name="note" placeholder="Opcional" />
        </Field>
      </FormModal>

      <FormModal
        title="Registrar ingreso"
        action={submitIngreso}
        submitLabel="Registrar"
        receipt={ingresoReceipt}
        hideTrigger
        open={active === "ingreso"}
        onOpenChange={close}
      >
        <Field label="Monto" htmlFor={`${idPrefix}-inc-amount`} required>
          <MoneyInput id={`${idPrefix}-inc-amount`} name="amount" required />
        </Field>
        <Field label="Fecha del pago" htmlFor={`${idPrefix}-inc-date`} required>
          <DateField id={`${idPrefix}-inc-date`} name="pay_date" defaultValue={today} required />
        </Field>
        <Field
          label="¿Cómo cobras?"
          htmlFor={`${idPrefix}-inc-method`}
          hint="A esa cuenta se acredita, salvo que elijas una abajo."
        >
          <Select id={`${idPrefix}-inc-method`} name="payment_method" defaultValue="efectivo">
            <option value="efectivo">Efectivo</option>
            <option value="banco">Depósito / transferencia (banco)</option>
            <option value="tarjeta_debito">Tarjeta débito</option>
            <option value="tarjeta_credito">Tarjeta crédito</option>
          </Select>
        </Field>
        {accounts.length > 0 && (
          <Field
            label="O elige una cuenta existente"
            htmlFor={`${idPrefix}-inc-account`}
            hint="Opcional. Tiene prioridad sobre ¿Cómo cobras?."
          >
            <Select id={`${idPrefix}-inc-account`} name="account_id" defaultValue="">
              <option value="">Usar “¿Cómo cobras?”</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nota" htmlFor={`${idPrefix}-inc-note`}>
          <Input id={`${idPrefix}-inc-note`} name="note" placeholder="Opcional" />
        </Field>
      </FormModal>

      <FormModal
        title="Nuevo movimiento"
        action={submitMovimiento}
        submitLabel="Registrar"
        receipt={movimientoReceipt}
        hideTrigger
        open={active === "movimiento"}
        onOpenChange={close}
      >
        {/* "Ingreso"/"Gasto" a secas repetían las palabras de las otras dos
            acciones del mismo botón +, que escriben en tablas distintas
            (salaries/expenses). Esto ajusta el saldo de una cuenta directo en
            el ledger, sin contar como sueldo ni como gasto presupuestado. */}
        <Field
          label="Tipo"
          htmlFor={`${idPrefix}-mv-kind`}
          hint="Ajusta el saldo de la cuenta sin contarlo en tu presupuesto."
        >
          <Select id={`${idPrefix}-mv-kind`} name="kind" defaultValue="retiro">
            <option value="deposito">Entrada sin categoría</option>
            <option value="retiro">Salida sin categoría</option>
          </Select>
        </Field>
        <Field label="Monto" htmlFor={`${idPrefix}-mv-amount`} required>
          <MoneyInput id={`${idPrefix}-mv-amount`} name="amount" required />
        </Field>
        <Field label="Fecha" htmlFor={`${idPrefix}-mv-date`} required>
          <DateField id={`${idPrefix}-mv-date`} name="date" defaultValue={today} required />
        </Field>
        <Field label="Cuenta" htmlFor={`${idPrefix}-mv-account`} required>
          <Select id={`${idPrefix}-mv-account`} name="account_id" required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nota" htmlFor={`${idPrefix}-mv-note`}>
          <Input id={`${idPrefix}-mv-note`} name="note" placeholder="Opcional" />
        </Field>
      </FormModal>

      <FormModal
        title="Nueva deuda"
        action={addDebt}
        submitLabel="Crear deuda"
        hideTrigger
        open={active === "deuda"}
        onOpenChange={close}
      >
        <input type="hidden" name="payment_type" value="unico" />
        <input type="hidden" name="acquired_date" value={today} />
        <Field label="Acreedor / nombre" htmlFor={`${idPrefix}-debt-name`} required>
          <Input id={`${idPrefix}-debt-name`} name="name" placeholder="Ej.: Préstamo banco" required />
        </Field>
        <Field label="Monto total" htmlFor={`${idPrefix}-debt-amount`} required>
          <MoneyInput id={`${idPrefix}-debt-amount`} name="total_amount" required />
        </Field>
        {/* Ancho completo, como todos los demás campos. El max-w-[180px] que
            llevaba venía de cuando esto era un <input type="date"> nativo y se
            quería evitar una caja enorme vacía; el nativo ya no está y el
            disparador de DateField es un botón normal que se comporta como
            cualquier otro control. */}
        <Field label="Fecha de pago" htmlFor={`${idPrefix}-debt-due`} hint="Opcional.">
          <DateField id={`${idPrefix}-debt-due`} name="due_date" />
        </Field>
        <Field label="Nota" htmlFor={`${idPrefix}-debt-note`}>
          <Input id={`${idPrefix}-debt-note`} name="note" placeholder="Opcional" />
        </Field>
      </FormModal>
    </>
  );
}
