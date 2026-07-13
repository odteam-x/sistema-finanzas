"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { PRIMARY_ROUTES, SECONDARY_ROUTES } from "./routes";
import { LogoutButton } from "./LogoutButton";

export function BottomTabBar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const rm = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const onSecondary = SECONDARY_ROUTES.some((r) => pathname === r.href);

  // Ocultar al bajar, mostrar al subir.
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > last + 6 && y > 90) setHidden(true);
        else if (y < last - 6) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="glass-strong absolute inset-x-0 bottom-0 rounded-t-[26px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              initial={rm ? false : { y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
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

      {/* Tab bar */}
      <motion.nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-[80] glass-nav border-t safe-bottom"
        animate={{ y: hidden && !moreOpen ? 100 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <ul className="grid grid-cols-5">
          {PRIMARY_ROUTES.map((r) => {
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
      </motion.nav>
    </>
  );
}
