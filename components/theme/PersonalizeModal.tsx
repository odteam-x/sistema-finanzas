"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import {
  readTheme,
  writeTheme,
  THEME_COLORS,
  type ThemePref,
  type ThemeMode,
} from "@/lib/theme";
import { readProfile, writeProfile } from "@/lib/profile";

interface PersonalizeModalProps {
  open: boolean;
  onClose: () => void;
}

export function PersonalizeModal({ open, onClose }: PersonalizeModalProps) {
  // Init perezoso: en el servidor no hay localStorage (readTheme/readProfile
  // ya lo manejan devolviendo el default). El modal arranca cerrado, así que
  // no hay riesgo de mismatch de hidratación con estos valores.
  const [pref, setPref] = useState<ThemePref>(readTheme);
  const [name, setName] = useState<string>(() => readProfile().displayName);

  function update(next: Partial<ThemePref>) {
    const merged = { ...pref, ...next };
    setPref(merged);
    writeTheme(merged);
  }

  function updateName(value: string) {
    setName(value);
    writeProfile({ displayName: value });
  }

  return (
    <Modal open={open} onClose={onClose} title="Personalizar" compact>
      <p className="text-sm text-muted -mt-1 mb-4">
        Elige un color y el modo de la app. Se guarda en este dispositivo.
      </p>

      <label htmlFor="display-name" className="text-xs font-bold text-ink mb-2 block">
        Tu nombre
      </label>
      <Input
        id="display-name"
        value={name}
        onChange={(e) => updateName(e.target.value)}
        placeholder="¿Cómo te llamas?"
        maxLength={40}
        className="mb-1.5"
      />
      <p className="text-xs text-muted mb-5">
        El asistente IA lo usará para dirigirse a ti cuando esté activo.
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
