"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

/** Transición suave de entrada al cambiar de sección.
 *  Solo anima opacity (nunca transform): cualquier `transform` en un
 *  ancestro — incluso translateY(0px) en reposo — crea un containing block
 *  nuevo y rompe `position: sticky`/`fixed` en los descendientes (ver
 *  Modal.tsx, que por el mismo motivo porta a document.body). El header de
 *  cada pantalla necesita quedar sticky, así que aquí no se puede animar y. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const rm = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={rm ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.div>
  );
}
