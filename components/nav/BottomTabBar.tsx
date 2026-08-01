"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { PRIMARY_ROUTES, SECONDARY_GROUPS, SECONDARY_ROUTES } from "./routes";
import { LogoutButton } from "./LogoutButton";

export function BottomTabBar({
  email,
  fab,
}: {
  email: string | null;
  /** El FAB llega como slot ya renderizado desde el servidor: necesita la
   *  lista de cuentas para sus formularios y la barra no. */
  fab: React.ReactNode;
}) {
  const pathname = usePathname();
  const rm = useReducedMotion();
  const dragControls = useDragControls();
  const [pedidoAbrir, setPedidoAbrir] = useState(false);
  // Ruta en la que se abrió la hoja. Sirve para cerrarla sola al navegar.
  const [rutaAlAbrir, setRutaAlAbrir] = useState(pathname);
  const onSecondary = SECONDARY_ROUTES.some((r) => pathname === r.href);

  /* La hoja se cierra cuando la ruta YA cambió, y eso se DERIVA en el render
     en vez de resolverse con un efecto.

     Antes cada enlace de la hoja cerraba la hoja en su propio onClick, o sea
     que desmontaba el <Link> en el mismo instante en que Next arrancaba la
     navegación —que es una transición de React— y la transición se abortaba:
     la hoja se cerraba y no pasaba nada más. Por eso fallaban las 11 secciones
     de "Más" y no las pestañas de la barra, que no se desmontan al tocarlas.

     Tampoco valdría un useEffect que llame a setState al cambiar `pathname`:
     este proyecto trata `react-hooks/set-state-in-effect` como error. */
  const moreOpen = pedidoAbrir && rutaAlAbrir === pathname;

  function abrirMas() {
    setRutaAlAbrir(pathname);
    setPedidoAbrir(true);
  }

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
              className="absolute inset-0 bg-black/55"
              onClick={() => setPedidoAbrir(false)}
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
                if (info.offset.y > 90 || info.velocity.y > 500) setPedidoAbrir(false);
              }}
            >
              {/* Asa arrastrable: desliza hacia abajo para cerrar */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="-mt-1 mb-2 flex justify-center py-2 touch-none cursor-grab active:cursor-grabbing"
              >
                <div className="h-1.5 w-11 rounded-pill bg-line-strong" />
              </div>
              {/* Rejilla de tiles agrupada: el ícono vive en un cuadrado de
                  tinte sólido y la etiqueta va debajo, fuera del tile — así
                  las secciones se escanean por forma y color en vez de leerse
                  como una lista de texto. Con las 11 en una sola rejilla el
                  orden era el del archivo y no significaba nada: "Balance"
                  caía pegado a "Ahorros" pero también a "Deudas". Los
                  encabezados dicen de qué va cada bloque.
                  El scroll vive acá y no en la hoja entera para que el asa de
                  arrastre y el bloque de cerrar sesión no se vayan de vista:
                  agrupado son ~460px de rejilla, y en un teléfono chico la
                  hoja se saldría por arriba. */}
              <div className="max-h-[62dvh] overflow-y-auto overscroll-contain flex flex-col gap-4">
                {SECONDARY_GROUPS.map((g) => (
                  <nav key={g.group} aria-label={g.label}>
                    <p className="px-1 mb-2 text-xs font-bold uppercase tracking-wide text-subtle">
                      {g.label}
                    </p>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                      {g.routes.map((r) => {
                        const active = pathname === r.href;
                        return (
                          <Link
                            key={r.href}
                            href={r.href}
                            aria-current={active ? "page" : undefined}
                            className="flex flex-col items-center gap-1.5 group active:scale-[0.97] transition-transform"
                          >
                            <span
                              className={cn(
                                "grid place-items-center size-14 rounded-tile transition-colors",
                                active
                                  ? "bg-gradient-brand text-white"
                                  : "bg-tint-brand text-primary-fg group-hover:bg-primary-soft",
                              )}
                            >
                              <Icon name={r.icon} size={24} weight={active ? "fill" : "light"} />
                            </span>
                            <span
                              className={cn(
                                "text-xs font-semibold text-center leading-tight",
                                active ? "text-primary-fg" : "text-muted",
                              )}
                            >
                              {r.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </nav>
                ))}
              </div>
              {/* Separado por espacio, no por línea. */}
              <div className="mt-6">
                {email && <p className="text-xs text-muted px-1 mb-1.5 truncate">{email}</p>}
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
        <nav className="surface-nav border rounded-pill overflow-hidden">
          <ul className="grid grid-cols-5 px-2">
            {PRIMARY_ROUTES.slice(0, 2).map((r) => {
              const active = pathname === r.href;
              return (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[52px] text-[0.75rem] font-semibold transition-colors active:scale-95",
                      active ? "text-primary-fg" : "text-muted",
                    )}
                  >
                    <Icon name={r.icon} size={23} weight={active ? "fill" : "light"} />
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
                      "flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[52px] text-[0.75rem] font-semibold transition-colors active:scale-95",
                      active ? "text-primary-fg" : "text-muted",
                    )}
                  >
                    <Icon name={r.icon} size={23} weight={active ? "fill" : "light"} />
                    {r.shortLabel}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                onClick={abrirMas}
                aria-label="Más secciones"
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[52px] w-full text-[0.75rem] font-semibold transition-colors cursor-pointer active:scale-95",
                  onSecondary ? "text-primary-fg" : "text-muted",
                )}
              >
                <Icon name="menu" size={23} weight={onSecondary ? "fill" : "light"} />
                Más
              </button>
            </li>
          </ul>
        </nav>
        {fab}
      </div>
    </>
  );
}
