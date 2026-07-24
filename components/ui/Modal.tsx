"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Diálogo más angosto (ej. detalle de un día del calendario). */
  compact?: boolean;
}

/**
 * Por dentro usa Radix Dialog (porta a document.body, atrapa el foco,
 * bloquea el scroll del fondo y cierra con Escape — todo maneral antes a
 * mano). `forceMount` + el `{open && ...}` de AnimatePresence le ceden el
 * control de cuándo desmontar a framer-motion, para poder animar la
 * salida; Radix solo controla accesibilidad/interacción mientras tanto.
 * La API externa ({open, onClose, title, children, footer, compact}) no
 * cambia, así que los ~15 sitios que usan Modal (vía FormModal,
 * DeleteButton, CalendarView, PersonalizeModal) no necesitan tocarse.
 */
export function Modal({ open, onClose, title, children, footer, compact }: ModalProps) {
  const dragControls = useDragControls();

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  onClick={onClose}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
                />
              </Dialog.Overlay>

              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  drag="y"
                  dragControls={dragControls}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 90 || info.velocity.y > 500) onClose();
                  }}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                  className={cn(
                    "modal-surface relative w-full max-h-[85dvh] overflow-y-auto rounded-[26px] p-5 sm:p-6",
                    compact ? "max-w-xs sm:max-w-sm" : "sm:max-w-md",
                  )}
                >
                  {/* Asa arrastrable (solo móvil): desliza hacia abajo para cerrar */}
                  <div
                    onPointerDown={(e) => dragControls.start(e)}
                    className="sm:hidden -mt-1 mb-2 flex justify-center py-2 touch-none cursor-grab active:cursor-grabbing"
                  >
                    <div className="h-1.5 w-11 rounded-full bg-black/20" />
                  </div>

                  <div className="flex items-center justify-between gap-3 mb-4">
                    <Dialog.Title asChild>
                      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        aria-label="Cerrar"
                        className="grid place-items-center size-11 rounded-full hover:bg-black/5 text-muted cursor-pointer transition-colors active:scale-90"
                      >
                        <Icon name="close" size={20} />
                      </button>
                    </Dialog.Close>
                  </div>

                  {children}

                  {footer && <div className="mt-5 flex gap-2">{footer}</div>}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
