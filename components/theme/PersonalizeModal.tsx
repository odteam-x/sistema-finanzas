"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  readTheme,
  writeTheme,
  THEME_COLORS,
  type ThemePref,
  type ThemeMode,
} from "@/lib/theme";

interface PersonalizeModalProps {
  open: boolean;
  onClose: () => void;
}

export function PersonalizeModal({ open, onClose }: PersonalizeModalProps) {
  // Init perezoso: en el servidor no hay localStorage (readTheme ya lo
  // maneja devolviendo el default). El modal arranca cerrado, así que no
  // hay riesgo de mismatch de hidratación con este valor.
  const [pref, setPref] = useState<ThemePref>(readTheme);

  function update(next: Partial<ThemePref>) {
    const merged = { ...pref, ...next };
    setPref(merged);
    writeTheme(merged);
  }

  return (
    <Modal open={open} onClose={onClose} title="Personalizar" compact>
      <p className="text-sm text-muted -mt-1 mb-4">
        Elige un color y el modo de la app. Se guarda en este dispositivo. Tu
        nombre se edita desde Configuración.
      </p>

      <p className="text-xs font-bold text-ink mb-2">Color</p>
      <div className="flex items-center gap-3 mb-5">
        {THEME_COLORS.map((c) => {
          const active = pref.color === c.value;
          return (
            <button
              key={c.value}
              onClick={() => update({ color: c.value })}
              aria-label={c.label}
              aria-pressed={active}
              className="size-11 rounded-full grid place-items-center transition-transform cursor-pointer active:scale-90"
              style={{
                backgroundColor: c.swatch,
                boxShadow: active
                  ? `0 0 0 3px var(--glass-bg-modal), 0 0 0 5px ${c.swatch}`
                  : undefined,
              }}
            >
              {active && <Icon name="check" size={18} className="text-white" />}
            </button>
          );
        })}
      </div>

      <p className="text-xs font-bold text-ink mb-2">Modo</p>
      <div className="grid grid-cols-2 gap-2">
        {(["light", "dark"] as ThemeMode[]).map((m) => {
          const active = pref.mode === m;
          return (
            <button
              key={m}
              onClick={() => update({ mode: m })}
              aria-pressed={active}
              className={cn(
                "flex items-center justify-center gap-2 min-h-11 rounded-2xl font-semibold text-sm cursor-pointer transition-colors active:scale-[0.97]",
                active
                  ? "bg-primary text-white"
                  : "border border-black/10 text-ink hover:bg-black/5",
              )}
            >
              <Icon name={m === "light" ? "sun" : "moon"} size={16} />
              {m === "light" ? "Claro" : "Oscuro"}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
