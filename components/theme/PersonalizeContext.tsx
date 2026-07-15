"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { PersonalizeModal } from "./PersonalizeModal";
import { applyTheme, readTheme } from "@/lib/theme";

interface PersonalizeContextValue {
  open: () => void;
}

const PersonalizeContext = createContext<PersonalizeContextValue | null>(null);

/**
 * Monta el modal de "Personalizar" UNA sola vez, como hermano de `children`
 * (no anidado dentro de nada que pueda desmontarse condicionalmente, como el
 * sheet "Más" de móvil). Así el modal sobrevive aunque quien lo abrió deje
 * de existir un instante después (ver bug: se cerraba solo).
 */
export function PersonalizeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Modo "Automático": si el sistema cambia de claro a oscuro (o viceversa)
  // con la app abierta, re-aplicar sin recargar. Reaplicar siempre es
  // inofensivo si el usuario eligió un modo explícito (resolveMode lo
  // ignora, ver lib/theme.ts).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(readTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <PersonalizeContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <PersonalizeModal open={open} onClose={() => setOpen(false)} />
    </PersonalizeContext.Provider>
  );
}

export function useOpenPersonalize(): () => void {
  const ctx = useContext(PersonalizeContext);
  if (!ctx) {
    throw new Error("useOpenPersonalize debe usarse dentro de <PersonalizeProvider>");
  }
  return ctx.open;
}
