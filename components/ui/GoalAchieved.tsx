"use client";

import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Illustration } from "./Illustration";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { Money } from "./Money";
import {
  markGoalCelebrated,
  readCelebratedGoals,
  serverCelebratedGoals,
  subscribeCelebratedGoals,
} from "@/lib/celebratedGoals";

export interface AchievedGoal {
  id: string;
  name: string;
  target: number;
}

/** Pantalla de logro al completar una meta de ahorro.
 *
 *  Es el ÚNICO momento celebratorio de la app, y vive solo en Ahorros. La
 *  evidencia que respalda esta fase dice que la gamificación funciona en
 *  ahorro y genera ansiedad en deuda, así que Deudas no tiene nada parecido:
 *  saldar una deuda se confirma con calma. Es la misma razón por la que el
 *  tono dorado está restringido a esta pantalla y al ícono de la meta lograda.
 *
 *  Se dispara comparando las metas completas contra las ya celebradas en este
 *  dispositivo, no contra el resultado de una acción: así sale igual sin
 *  importar cómo se completó la meta —un aporte, el saldo de la cuenta
 *  vinculada o el pago de una deuda atada— que son tres caminos distintos. */
export function GoalAchieved({ completed }: { completed: AchievedGoal[] }) {
  const celebradas = useSyncExternalStore(
    subscribeCelebratedGoals,
    readCelebratedGoals,
    serverCelebratedGoals,
  );
  const pendiente = completed.find((g) => !celebradas.includes(g.id));
  const [cerrada, setCerrada] = useState<string | null>(null);
  const rm = useReducedMotion();

  const visible = pendiente && cerrada !== pendiente.id;

  function cerrar() {
    if (!pendiente) return;
    markGoalCelebrated(pendiente.id);
    setCerrada(pendiente.id);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Meta lograda: ${pendiente.name}`}
          className="fixed inset-0 z-[120] grid place-items-center p-6 bg-surface"
          initial={rm ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
          <div className="flex flex-col items-center text-center gap-4 max-w-xs">
            <motion.span
              className="grid place-items-center size-20 rounded-pill bg-achievement-soft text-achievement"
              initial={rm ? false : { scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <Icon name="goal" size={40} filled />
            </motion.span>

            <Illustration name="goals" width={140} />

            <div>
              {/* La única pantalla de la app donde se admite un signo de
                  admiración (ver MICROCOPY). */}
              <h2 className="text-2xl font-bold text-ink">¡Meta lograda!</h2>
              <p className="text-base text-muted mt-1">
                Completaste <span className="font-semibold text-ink">{pendiente.name}</span>:{" "}
                <Money value={pendiente.target} decimals={false} />
              </p>
            </div>

            <Button onClick={cerrar} full>
              Seguir ahorrando
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
