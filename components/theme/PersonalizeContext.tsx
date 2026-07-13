"use client";

import { createContext, useContext, useState } from "react";
import { PersonalizeModal } from "./PersonalizeModal";

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
