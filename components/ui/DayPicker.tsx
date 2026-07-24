"use client";

import { useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Icon } from "./Icon";

/** R06: elegir un día concreto para ver solo sus movimientos. El estado vive
 *  en la URL (?dia=) para poder compartir y recargar con el filtro puesto.
 *
 *  Antes esto era un <label> envolviendo el <input type="date">: al tocar el
 *  input, el label reenviaba el click al propio input y el selector nativo se
 *  reabría solo (el "autoclick"). Ahora el input es independiente y el ícono
 *  es decorativo. */
export function DayPicker({
  value,
  /** Días que SÍ tienen movimientos. Los demás quedan fuera de rango, así no
   *  se puede filtrar por un día que garantizado saldría vacío. */
  availableDays = [],
}: {
  value: string;
  availableDays?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("dia", next);
      params.delete("range");
    } else {
      params.delete("dia");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // El input de fecha nativo no permite deshabilitar días sueltos, solo
  // acotar el rango — así que al menos se limita a la ventana donde hay
  // datos, en vez de dejar navegar por años vacíos.
  const sorted = [...availableDays].sort();
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return (
    <div className="glass inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold text-ink">
      <Icon name="calendar" size={15} className="text-muted shrink-0" aria-hidden="true" />
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Ver un día específico"
        className="bg-transparent text-sm font-semibold text-ink focus:outline-none cursor-pointer"
      />
    </div>
  );
}
