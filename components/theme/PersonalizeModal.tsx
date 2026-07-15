"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { readTheme, writeTheme, type ThemePref, type ThemeMode } from "@/lib/theme";

interface PersonalizeModalProps {
  open: boolean;
  onClose: () => void;
}

const MODES: { value: ThemeMode; label: string; icon: "sun" | "moon" | "settings" }[] = [
  { value: "light", label: "Claro", icon: "sun" },
  { value: "dark", label: "Oscuro", icon: "moon" },
  { value: "auto", label: "Automático", icon: "settings" },
];

export function PersonalizeModal({ open, onClose }: PersonalizeModalProps) {
  // Init perezoso: en el servidor no hay localStorage (readTheme ya lo
  // maneja devolviendo el default). El modal arranca cerrado, así que no
  // hay riesgo de mismatch de hidratación con este valor.
  const [pref, setPref] = useState<ThemePref>(readTheme);

  function update(mode: ThemeMode) {
    const merged = { mode };
    setPref(merged);
    writeTheme(merged);
  }

  return (
    <Modal open={open} onClose={onClose} title="Personalizar" compact>
      <p className="text-sm text-muted -mt-1 mb-4">Se guarda solo en este dispositivo.</p>

      <p className="text-xs font-bold text-ink mb-2">Modo</p>
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => {
          const active = pref.mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => update(m.value)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 min-h-16 rounded-2xl font-semibold text-xs cursor-pointer transition-colors active:scale-[0.97]",
                active
                  ? "bg-primary text-white"
                  : "border border-black/10 text-ink hover:bg-black/5",
              )}
            >
              <Icon name={m.icon} size={18} />
              {m.label}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
