"use client";

import { useEffect } from "react";
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Scrim */}
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] cursor-default"
      />

      {/* Panel */}
      <div
        className="glass-strong relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto
                   rounded-t-[24px] sm:rounded-[24px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]
                   animate-[sheet_.22s_ease-out]"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid place-items-center size-9 rounded-full hover:bg-black/5 text-muted cursor-pointer"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {children}

        {footer && <div className="mt-5 flex gap-2">{footer}</div>}
      </div>

      <style>{`@keyframes sheet{from{opacity:.4;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
