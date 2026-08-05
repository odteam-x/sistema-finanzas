"use client";

import { useState } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconBubble } from "@/components/ui/IconBubble";
import { QuickForms, type QuickForm } from "@/components/quick/QuickForms";
import type { SavingsAccount } from "@/lib/types";

function QuickRow({
  icon,
  tone,
  title,
  sub,
  onClick,
}: {
  icon: IconName;
  tone: "brand" | "income" | "expense" | "warning" | "info" | "neutral";
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-2.5 rounded-tile hover:bg-surface-sunken active:scale-[0.97] transition-colors text-left cursor-pointer"
    >
      <IconBubble icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="font-semibold text-ink text-sm">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </button>
  );
}

/** Botón flotante central de la tab bar: abre una hoja con los accesos
 *  directos para registrar dinero sin salir de la pantalla en la que estés.
 *  Los formularios en sí viven en QuickForms, compartidos con la fila de
 *  acciones rápidas del Inicio. */
export function QuickAddFab({ accounts }: { accounts: SavingsAccount[] }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<QuickForm>(null);
  const rm = useReducedMotion();
  const dragControls = useDragControls();

  function pick(form: QuickForm) {
    setSheetOpen(false);
    setActiveForm(form);
  }

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        aria-label="Agregar"
        className="absolute left-1/2 -translate-x-1/2 -top-5 grid place-items-center size-14 rounded-pill bg-gradient-brand text-on-brand shadow-fab cursor-pointer active:scale-[0.97] transition-transform"
      >
        <Icon name="plus" size={26} />
      </button>

      <AnimatePresence>
        {sheetOpen && (
          <div className="lg:hidden fixed inset-0 z-[95]" role="dialog" aria-modal="true">
            <motion.button
              aria-label="Cerrar"
              className="absolute inset-0 bg-black/55"
              onClick={() => setSheetOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.div
              className="surface-sheet absolute inset-x-0 bottom-0 rounded-t-hero p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
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
                <div className="h-1.5 w-11 rounded-pill bg-line-strong" />
              </div>
              <p className="text-sm font-bold text-ink px-1 mb-2">Agregar</p>
              <div className="flex flex-col gap-1">
                <QuickRow
                  icon="arrowUpRight"
                  tone="expense"
                  title="Gasto"
                  sub="Registra un gasto rápido"
                  onClick={() => pick("gasto")}
                />
                <QuickRow
                  icon="arrowDownLeft"
                  tone="income"
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
                <QuickRow
                  icon="debt"
                  tone="warning"
                  title="Deuda"
                  sub="Registra un préstamo o cuenta por pagar"
                  onClick={() => pick("deuda")}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <QuickForms
        accounts={accounts}
        active={activeForm}
        onClose={() => setActiveForm(null)}
        idPrefix="fab"
      />
    </>
  );
}
