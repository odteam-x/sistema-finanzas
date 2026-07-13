"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
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
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px] cursor-default"
          />

          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-strong relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto
                       rounded-t-[26px] sm:rounded-[26px] p-5 sm:p-6
                       pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            {/* Asa (solo móvil) */}
            <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />

            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-extrabold text-ink">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="grid place-items-center size-9 rounded-full hover:bg-black/5 text-muted cursor-pointer transition-colors"
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
