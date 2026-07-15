"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { PRIMARY_ROUTES, SECONDARY_ROUTES } from "./routes";
import { LogoutButton } from "./LogoutButton";
import { QuickAddFab } from "./QuickAddFab";
import type { SavingsAccount } from "@/lib/types";

export function BottomTabBar({
  email,
  accounts,
}: {
  email: string | null;
  accounts: SavingsAccount[];
}) {
  const pathname = usePathname();
  const rm = useReducedMotion();
  const dragControls = useDragControls();
  const [moreOpen, setMoreOpen] = useState(false);
  const onSecondary = SECONDARY_ROUTES.some((r) => pathname === r.href);

  // Bloquear scroll del fondo mientras el menú "Más" está abierto (evita
  // repintados del contenido detrás mientras anima, que era parte del lag).
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <>
      {/* Sheet "Más" */}
      <AnimatePresence>
        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-[90]" role="dialog" aria-modal="true">
            <motion.button
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMoreOpen(false)}
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
                if (info.offset.y > 90 || info.velocity.y > 500) setMoreOpen(false);
              }}
            >
              {/* Asa arrastrable: desliza hacia abajo para cerrar */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="-mt-1 mb-2 flex justify-center py-2 touch-none cursor-grab active:cursor-grabbing"
              >
                <div className="h-1.5 w-11 rounded-full bg-black/20" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {SECONDARY_ROUTES.map((r) => {
                  const active = pathname === r.href;
                  return (
                    <Link
                      key={r.href}
                      href={r.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 rounded-2xl font-semibold text-xs transition-colors active:scale-[0.97]",
                        active ? "bg-primary text-white" : "text-ink/80 hover:bg-black/5",
                      )}
                    >
                      <Icon name={r.icon} size={22} />
                      {r.label}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-2 border-t border-black/5 pt-2">
                {email && <p className="text-xs text-muted px-1 mb-1 truncate">{email}</p>}
                <LogoutButton />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab bar: píldora flotante, siempre fija (no se oculta al hacer scroll).
          El FAB vive fuera del <nav> (que recorta con overflow-hidden para el
          borde redondeado) para poder sobresalir por encima sin que se corte. */}
      <div className="lg:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-[80]">
        <nav className="glass-nav border rounded-full overflow-hidden shadow-lg shadow-black/15">
          <ul className="grid grid-cols-5 px-2">
            {PRIMARY_ROUTES.slice(0, 2).map((r) => {
              const active = pathname === r.href;
              return (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[52px] text-[0.68rem] font-semibold transition-colors active:scale-95",
                      active ? "text-primary" : "text-muted",
                    )}
                  >
                    <Icon name={r.icon} size={23} />
                    {r.shortLabel}
                  </Link>
                </li>
              );
            })}
            <li aria-hidden="true" />
            {PRIMARY_ROUTES.slice(2).map((r) => {
              const active = pathname === r.href;
              return (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[52px] text-[0.68rem] font-semibold transition-colors active:scale-95",
                      active ? "text-primary" : "text-muted",
                    )}
                  >
                    <Icon name={r.icon} size={23} />
                    {r.shortLabel}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                onClick={() => setMoreOpen(true)}
                aria-label="Más secciones"
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[52px] w-full text-[0.68rem] font-semibold transition-colors cursor-pointer active:scale-95",
                  onSecondary ? "text-primary" : "text-muted",
                )}
              >
                <Icon name="menu" size={23} />
                Más
              </button>
            </li>
          </ul>
        </nav>
        <QuickAddFab accounts={accounts} />
      </div>
    </>
  );
}
