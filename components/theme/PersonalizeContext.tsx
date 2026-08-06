"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { PersonalizeModal } from "./PersonalizeModal";
import { applyTheme, readTheme } from "@/lib/theme";
import { hasStoredTextScale, isTextScale, writeTextScale } from "@/lib/textScale";

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
export function PersonalizeProvider({
  children,
  accountTextScale,
}: {
  children: React.ReactNode;
  /** La escala guardada en la CUENTA (user_profile.text_scale, v32). Sirve
   *  para sembrar un dispositivo nuevo; en uno que ya eligió, manda lo local. */
  accountTextScale?: number;
}) {
  const [open, setOpen] = useState(false);

  // Siembra desde la cuenta. Solo si este dispositivo no ha elegido NUNCA:
  // `hasStoredTextScale` distingue "el usuario eligió Normal aquí" de "no hay
  // nada guardado", que con un simple `=== 1` serían indistinguibles y harían
  // que la cuenta pisara una elección local deliberada.
  //
  // Corre después del primer pintado, así que en un dispositivo nuevo con
  // escala grande hay un salto de tamaño. Es inevitable: el valor está en la
  // base y el primer pintado ocurre antes de poder leerla. Pasa una sola vez
  // por dispositivo — a partir de ahí lo aplica el script de arranque.
  useEffect(() => {
    if (accountTextScale === undefined) return;
    if (hasStoredTextScale()) return;
    if (!isTextScale(accountTextScale)) return;
    writeTextScale(accountTextScale);
  }, [accountTextScale]);

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
