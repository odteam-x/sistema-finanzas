"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "./Icon";

const UNDO_WINDOW_MS = 8000;

interface ToastState {
  id: number;
  message: string;
  onUndo?: () => void | Promise<void>;
}

interface ToastApi {
  /** Muestra un aviso; si trae `onUndo`, aparece el botón "Deshacer". */
  show: (message: string, onUndo?: () => void | Promise<void>) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Aviso flotante con ventana de "Deshacer" (~8 s). Vive en el layout para
 *  que sobreviva aunque el elemento que disparó la acción (una fila que se
 *  acaba de borrar, un modal que se cerró) ya no exista. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [undoing, setUndoing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useReducedMotion();

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
    setUndoing(false);
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, onUndo) => {
      if (timer.current) clearTimeout(timer.current);
      setUndoing(false);
      setToast({ id: Date.now(), message, onUndo });
      timer.current = setTimeout(() => setToast(null), UNDO_WINDOW_MS);
    },
    [],
  );

  async function handleUndo() {
    if (!toast?.onUndo || undoing) return;
    setUndoing(true);
    await toast.onUndo();
    dismiss();
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            // Por encima de la barra inferior para no taparla.
            className="fixed bottom-[6.5rem] lg:bottom-6 left-3 right-3 lg:left-auto lg:right-6 lg:max-w-sm z-[95] surface-sheet rounded-tile shadow-raised px-4 py-3 flex items-center gap-3"
            initial={rm ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            <p className="text-sm text-ink min-w-0 flex-1">{toast.message}</p>
            {toast.onUndo && (
              <button
                onClick={handleUndo}
                disabled={undoing}
                className="shrink-0 inline-flex items-center gap-1 rounded-pill bg-primary-soft px-3 min-h-11 text-sm font-bold text-primary-fg cursor-pointer disabled:opacity-60"
              >
                <Icon name="repeat" size={15} />
                {undoing ? "…" : "Deshacer"}
              </button>
            )}
            <button
              onClick={dismiss}
              aria-label="Cerrar aviso"
              className="shrink-0 grid place-items-center size-11 rounded-pill text-muted hover:bg-surface-sunken cursor-pointer"
            >
              <Icon name="close" size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

/** Devuelve `show`. Si no hay provider (no debería pasar dentro de (app)),
 *  degrada a no hacer nada en vez de romper la pantalla. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { show: () => {} };
}
