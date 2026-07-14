"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
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

export function Modal({ open, onClose, title, children, footer, compact }: ModalProps) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Portal a document.body: si no, el modal hereda el "contexto de
  // contención" del motion.div de PageTransition (tiene transform, aunque
  // sea identidad) y su `fixed` deja de posicionarse contra el viewport
  // real — quedaba atrapado dentro del ancho de la página.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.button
            aria-label="Cerrar"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
          />

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
              <h2 className="text-lg font-extrabold text-ink">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="grid place-items-center size-9 rounded-full hover:bg-black/5 text-muted cursor-pointer transition-colors active:scale-90"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {children}

            {footer && <div className="mt-5 flex gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
