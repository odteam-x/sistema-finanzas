"use client";

import { useState } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconBubble } from "@/components/ui/IconBubble";
import { Field, Input, Select, MoneyInput } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { addExpense } from "@/app/(app)/presupuesto/actions";
import { addSalary } from "@/app/(app)/ingresos/actions";
import { addMovement } from "@/app/(app)/balance/actions";
import { todayISO } from "@/lib/format";
import type { SavingsAccount } from "@/lib/types";

type QuickForm = "gasto" | "ingreso" | "movimiento" | null;

function QuickRow({
  icon,
  tone,
  title,
  sub,
  onClick,
}: {
  icon: IconName;
  tone: "brand" | "danger" | "neutral";
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-2.5 rounded-2xl hover:bg-black/5 active:scale-[0.98] transition-colors text-left cursor-pointer"
    >
      <IconBubble icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="font-semibold text-ink text-sm">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </button>
  );
}

/** Botón flotante central de la tab bar: abre una hoja con 3 accesos
 *  directos (Gasto/Ingreso/Movimiento) para registrar dinero sin salir de
 *  la pantalla en la que el usuario está. Reutiliza las mismas server
 *  actions que Presupuesto/Ingresos/Balance — nada de lógica duplicada. */
export function QuickAddFab({ accounts }: { accounts: SavingsAccount[] }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<QuickForm>(null);
  const rm = useReducedMotion();
  const dragControls = useDragControls();
  const today = todayISO();

  function pick(form: QuickForm) {
    setSheetOpen(false);
    setActiveForm(form);
  }

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        aria-label="Agregar"
        className="absolute left-1/2 -translate-x-1/2 -top-5 grid place-items-center size-14 rounded-full bg-gradient-brand text-white shadow-lg shadow-black/25 cursor-pointer active:scale-95 transition-transform"
      >
        <Icon name="plus" size={26} />
      </button>

      <AnimatePresence>
        {sheetOpen && (
          <div className="lg:hidden fixed inset-0 z-[95]" role="dialog" aria-modal="true">
            <motion.button
              aria-label="Cerrar"
              className="absolute inset-0 bg-black/40"
              onClick={() => setSheetOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.div
              className="sheet-surface absolute inset-x-0 bottom-0 rounded-t-[26px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              style={{ willChange: "transform" }}
              initial={rm ? false : { y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 500) setSheetOpen(false);
              }}
            >
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="-mt-1 mb-2 flex justify-center py-2 touch-none cursor-grab active:cursor-grabbing"
              >
                <div className="h-1.5 w-11 rounded-full bg-black/20" />
              </div>
              <p className="text-sm font-bold text-ink px-1 mb-2">Agregar</p>
              <div className="flex flex-col gap-1">
                <QuickRow
                  icon="arrowUpRight"
                  tone="danger"
                  title="Gasto"
                  sub="Registra un gasto rápido"
                  onClick={() => pick("gasto")}
                />
                <QuickRow
                  icon="arrowDownLeft"
                  tone="brand"
                  title="Ingreso"
                  sub="Sueldo o ingreso extra"
                  onClick={() => pick("ingreso")}
                />
                {accounts.length > 0 && (
                  <QuickRow
                    icon="movements"
                    tone="neutral"
                    title="Movimiento"
                    sub="Depósito o retiro manual"
                    onClick={() => pick("movimiento")}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FormModal
        title="Registrar gasto"
        action={addExpense}
        submitLabel="Registrar"
        hideTrigger
        open={activeForm === "gasto"}
        onOpenChange={(v) => !v && setActiveForm(null)}
      >
        <Field label="Monto" htmlFor="qa-exp-amount" required>
          <MoneyInput id="qa-exp-amount" name="amount" required />
        </Field>
        <Field label="Fecha" htmlFor="qa-exp-date" required>
          <Input id="qa-exp-date" name="date" type="date" defaultValue={today} required />
        </Field>
        <Field label="Nota" htmlFor="qa-exp-note">
          <Input id="qa-exp-note" name="note" placeholder="Opcional" />
        </Field>
      </FormModal>

      <FormModal
        title="Registrar ingreso"
        action={addSalary}
        submitLabel="Registrar"
        hideTrigger
        open={activeForm === "ingreso"}
        onOpenChange={(v) => !v && setActiveForm(null)}
      >
        <Field label="Monto" htmlFor="qa-inc-amount" required>
          <MoneyInput id="qa-inc-amount" name="amount" required />
        </Field>
        <Field label="Fecha del pago" htmlFor="qa-inc-date" required>
          <Input id="qa-inc-date" name="pay_date" type="date" defaultValue={today} required />
        </Field>
        <Field label="Nota" htmlFor="qa-inc-note">
          <Input id="qa-inc-note" name="note" placeholder="Opcional" />
        </Field>
      </FormModal>

      <FormModal
        title="Nuevo movimiento"
        action={addMovement}
        submitLabel="Registrar"
        hideTrigger
        open={activeForm === "movimiento"}
        onOpenChange={(v) => !v && setActiveForm(null)}
      >
        <Field label="Tipo" htmlFor="qa-mv-kind">
          <Select id="qa-mv-kind" name="kind" defaultValue="retiro">
            <option value="deposito">Ingreso</option>
            <option value="retiro">Gasto</option>
          </Select>
        </Field>
        <Field label="Monto" htmlFor="qa-mv-amount" required>
          <MoneyInput id="qa-mv-amount" name="amount" required />
        </Field>
        <Field label="Fecha" htmlFor="qa-mv-date" required>
          <Input id="qa-mv-date" name="date" type="date" defaultValue={today} required />
        </Field>
        <Field label="Cuenta" htmlFor="qa-mv-account" required>
          <Select id="qa-mv-account" name="account_id" required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nota" htmlFor="qa-mv-note">
          <Input id="qa-mv-note" name="note" placeholder="Opcional" />
        </Field>
      </FormModal>
    </>
  );
}
