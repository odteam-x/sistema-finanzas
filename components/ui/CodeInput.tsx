"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { PERSONAL_CODE_LENGTH, sanitizePersonalCode } from "@/lib/personalCode";

/** Seis casillas, una por dígito. Antes era un solo campo de texto con
 *  `tracking` ancho y un placeholder de cuatro puntos — que además mentía,
 *  porque el maxLength ya era 6. Con casillas separadas el largo es evidente
 *  sin tener que contar puntos.
 *
 *  Por dentro sigue habiendo UN input real (el hidden que viaja en el
 *  formulario): las casillas son la presentación, y el campo que recibe el
 *  teclado es uno solo y transparente encima. Así pegar el código completo
 *  funciona, el autocompletado de SMS del sistema funciona, y no hay que
 *  reimplementar el manejo de foco entre seis inputs. */
export function CodeInput({
  name,
  autoFocus,
  disabled,
  onComplete,
  "aria-label": ariaLabel = "Código personal",
}: {
  name: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Se dispara al llegar al sexto dígito — para enviar solo, sin que el
   *  usuario tenga que buscar el botón. */
  onComplete?: (code: string) => void;
  "aria-label"?: string;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function handleChange(raw: string) {
    const next = sanitizePersonalCode(raw);
    setValue(next);
    if (next.length === PERSONAL_CODE_LENGTH) onComplete?.(next);
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        // `one-time-code` es lo que hace que iOS y Android ofrezcan el código
        // del SMS y que el gestor de contraseñas no intente guardarlo como si
        // fuera una contraseña más.
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="\d*"
        maxLength={PERSONAL_CODE_LENGTH}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div aria-hidden="true" className="flex items-center justify-center gap-2">
        {Array.from({ length: PERSONAL_CODE_LENGTH }).map((_, i) => {
          const filled = i < value.length;
          const active = focused && i === value.length;
          return (
            <span
              key={i}
              className={cn(
                "grid place-items-center h-13 w-11 rounded-tile border text-xl font-extrabold tabular transition-colors",
                "bg-[var(--input-bg)] text-ink",
                active
                  ? "border-primary-fg"
                  : filled
                    ? "border-line-strong"
                    : "border-[var(--input-border)]",
                disabled && "opacity-50",
              )}
            >
              {filled ? "•" : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
