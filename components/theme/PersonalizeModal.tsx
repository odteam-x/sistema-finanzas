"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { readTheme, writeTheme, type ThemePref, type ThemeMode } from "@/lib/theme";
import {
  readTextScale,
  writeTextScale,
  TEXT_SCALES,
  TEXT_SCALE_LABEL,
  type TextScale,
} from "@/lib/textScale";
import { saveTextScale } from "@/app/(app)/configuracion/actions";

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
  const [scale, setScale] = useState<TextScale>(readTextScale);

  function update(mode: ThemeMode) {
    const merged = { mode };
    setPref(merged);
    writeTheme(merged);
  }

  function updateScale(next: TextScale) {
    // Se aplica y se guarda en el dispositivo PRIMERO, de forma síncrona: el
    // cambio se ve al instante y no depende de la red. La copia en la cuenta
    // va después y sin await — si falla, este dispositivo ya quedó bien y lo
    // único que se pierde es la propagación a los demás.
    setScale(next);
    writeTextScale(next);
    void saveTextScale(next);
  }

  return (
    <Modal open={open} onClose={onClose} title="Personalizar" compact>
      <p className="text-sm text-muted -mt-1 mb-4">El modo se guarda solo en este dispositivo.</p>

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
                "flex flex-col items-center justify-center gap-1.5 min-h-16 rounded-tile font-semibold text-xs cursor-pointer transition-colors active:scale-[0.97]",
                active
                  ? "bg-primary text-white"
                  : "border border-line-strong text-ink hover:bg-surface-sunken",
              )}
            >
              <Icon name={m.icon} size={18} />
              {m.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs font-bold text-ink mb-2 mt-5">Tamaño del texto</p>

      {/* La vista previa va ENCIMA de los botones y no debajo: en un teléfono,
          lo que queda debajo lo tapa el pulgar justo cuando estás tocando. */}
      {/* Sin font-size propio: al elegir una escala el documento entero ya
          queda a ese tamaño, así que fijar aquí `${scale}rem` multiplicaría
          dos veces y mostraría el CUADRADO de la escala. Este bloque escala
          porque está en rem como el resto; lo que lo convierte en vista previa
          es que los botones de al lado NO escalan, y contra ellos se ve el
          cambio. */}
      <div className="rounded-tile bg-surface-sunken px-3 py-2.5 mb-2">
        <p className="text-xs text-muted">Gastado hoy</p>
        <p className="text-[1.35em] font-extrabold text-ink tabular leading-tight">RD$1,250.00</p>
      </div>

      {/* Los tamaños de ESTOS botones van en px, no en rem: son el control que
          estás usando: si crecieran con su propio efecto, el que acabas de
          tocar se movería debajo del dedo y el siguiente quedaría en otro
          sitio. Lo que tiene que cambiar es la vista previa, no el mando. */}
      <div className="grid grid-cols-4 gap-2">
        {TEXT_SCALES.map((s) => {
          const active = scale === s;
          return (
            <button
              key={s}
              onClick={() => updateScale(s)}
              aria-pressed={active}
              className={cn(
                "flex items-center justify-center rounded-tile font-semibold cursor-pointer transition-colors active:scale-[0.97] text-[13px] leading-none px-1",
                active
                  ? "bg-primary text-white"
                  : "border border-line-strong text-ink hover:bg-surface-sunken",
              )}
              style={{ minHeight: 44 }}
            >
              {TEXT_SCALE_LABEL[s]}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted mt-2">
        El tamaño del texto sí se guarda en tu cuenta: lo vas a tener igual en
        cualquier dispositivo donde entres.
      </p>
    </Modal>
  );
}
