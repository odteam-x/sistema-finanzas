"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Diálogo pequeño y centrado (no hoja inferior), para acciones puntuales
   *  como el detalle de un día del calendario. */
  compact?: boolean;
}

export function Modal({ open, onClose, title, children, footer, compact }: ModalProps) {
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

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-[100] flex justify-center p-4",
            compact ? "items-center" : "items-end sm:items-center",
          )}
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
            initial={
              compact
                ? { opacity: 0, scale: 0.94 }
                : { opacity: 0, y: 48, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              compact
                ? { opacity: 0, scale: 0.96 }
                : { opacity: 0, y: 36, scale: 0.98 }
            }
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className={cn(
              "modal-surface relative w-full max-h-[85dvh] overflow-y-auto p-5 sm:p-6",
              compact
                ? "max-w-xs sm:max-w-sm rounded-[26px]"
                : "sm:max-w-md max-h-[90dvh] rounded-t-[26px] sm:rounded-[26px] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            )}
          >
            {/* Asa (solo móvil, solo en hoja inferior) */}
            {!compact && (
              <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
            )}

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
    </AnimatePresence>
  );
}
