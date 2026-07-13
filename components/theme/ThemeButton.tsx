"use client";

import { Icon } from "@/components/ui/Icon";
import { useOpenPersonalize } from "./PersonalizeContext";

interface ThemeButtonProps {
  /** "sidebar": fila como los enlaces del sidebar. "sheet": tile como en el menú "Más". */
  variant: "sidebar" | "sheet";
  onNavigate?: () => void;
}

/** Botón disparador del panel "Personalizar" (el modal vive en PersonalizeContext,
 *  siempre montado, para que sobreviva aunque el contenedor que abrió esto
 *  — ej. el sheet "Más" de móvil — se cierre justo después). */
export function ThemeButton({ variant, onNavigate }: ThemeButtonProps) {
  const openPersonalize = useOpenPersonalize();

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
