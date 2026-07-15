"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useOpenPersonalize } from "./PersonalizeContext";
import { readTheme, type ThemeMode } from "@/lib/theme";

interface ThemeButtonProps {
  /** "sidebar": fila como los enlaces del sidebar. "sheet": tile como en el
   *  menú "Más". "settings": fila de Configuración, con el modo actual. */
  variant: "sidebar" | "sheet" | "settings";
  onNavigate?: () => void;
}

const MODE_LABEL: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  auto: "Automático",
};

/** Botón disparador del panel "Personalizar" (el modal vive en PersonalizeContext,
 *  siempre montado, para que sobreviva aunque el contenedor que abrió esto
 *  — ej. el sheet "Más" de móvil — se cierre justo después). */
export function ThemeButton({ variant, onNavigate }: ThemeButtonProps) {
  const openPersonalize = useOpenPersonalize();
  // Init perezoso: en el servidor no hay localStorage (readTheme devuelve el
  // default). Solo importa para la fila de Configuración; no se re-lee tras
  // cerrar el modal (mismo nivel de frescura que el resto de lecturas
  // client-only de la app, ej. GreetingHero).
  const [mode] = useState<ThemeMode>(() => readTheme().mode);

  function openPanel() {
    openPersonalize();
    onNavigate?.();
  }

  if (variant === "sidebar") {
    return (
      <button
        onClick={openPanel}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm font-semibold text-ink/80 hover:bg-black/5 transition-colors cursor-pointer active:scale-[0.98]"
      >
        <Icon name="palette" size={19} />
        Personalizar
      </button>
    );
  }

  if (variant === "settings") {
    return (
      <button
        onClick={openPanel}
        className="flex w-full items-center justify-between gap-3 py-1 cursor-pointer text-left"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <Icon name="palette" size={18} className="text-muted" />
          Apariencia
        </span>
        <span className="flex items-center gap-1 text-sm text-muted">
          {MODE_LABEL[mode]}
          <Icon name="chevronRight" size={16} />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={openPanel}
      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl font-semibold text-xs text-ink/80 hover:bg-black/5 transition-colors active:scale-[0.97]"
    >
      <Icon name="palette" size={22} />
      Personalizar
    </button>
  );
}
