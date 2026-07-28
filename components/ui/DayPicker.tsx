"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Icon } from "./Icon";

/** Límites del input de fecha, o `{}` para no acotar nada.
 *
 *  iOS Safari: un `<input type="date">` VACÍO, al abrirse, intenta centrar la
 *  rueda en la fecha del sistema (hoy). Si hoy cae fuera de `[min, max]` — lo
 *  normal acá, porque `max` es el último día CON movimientos y casi nunca es
 *  hoy — WebKit la recorta al límite más cercano, y en un input controlado
 *  por React eso dispara `onChange` con una fecha que el usuario nunca
 *  eligió. Chrome/Android no recorta así, por eso el arreglo anterior del
 *  "autoclick" no cubrió iOS.
 *
 *  Por eso: sin valor elegido, sin límites. Y cuando hay valor, los límites
 *  se estiran para incluirlo — un `?dia=` de la URL fuera del rango caería en
 *  el mismo recorte. */
function dateBounds(value: string, availableDays: string[]): { min?: string; max?: string } {
  if (!value || availableDays.length === 0) return {};
  const days = [...availableDays].sort();
  const first = days[0];
  const last = days[days.length - 1];
  return {
    min: value < first ? value : first,
    max: value > last ? value : last,
  };
}

/** R06: elegir un día concreto para ver solo sus movimientos. El estado vive
 *  en la URL (?dia=) para poder compartir y recargar con el filtro puesto. */
export function DayPicker({
  value,
  /** Días que SÍ tienen movimientos — acotan hasta dónde se puede navegar
   *  una vez hay un día elegido (ver dateBounds sobre por qué no antes). */
  availableDays = [],
}: {
  value: string;
  availableDays?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const { min, max } = dateBounds(value, availableDays);
  const empty = value === "";

  // min-h-11 (44px) en vez del py-1.5 anterior: el pill medía 34px de alto,
  // por debajo del mínimo cómodo para tocar en un teléfono. Es parte del mismo
  // problema reportado en iPhone — un blanco chico obliga a apuntar, y cada
  // toque que se sale vuelve a abrir el selector.
  return (
    <div className="card inline-flex items-center gap-1.5 rounded-tile px-3 min-h-11 text-sm font-semibold text-ink">
      <Icon name="calendar" size={15} className="text-muted shrink-0" aria-hidden="true" />
      <span className="relative inline-flex items-center">
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Ver un día específico"
          // Sin valor, el texto propio del control se vuelve invisible y en su
          // lugar se pinta el <span> de abajo. `type="date"` no soporta
          // `placeholder` (no está en el spec): Chrome pinta "dd/mm/aaaa" por
          // su cuenta e iOS deja el campo en blanco. Ocultar ambos y poner un
          // texto propio es la única forma de que diga lo mismo en los dos.
          className={`min-w-[7rem] bg-transparent text-sm font-semibold focus:outline-none cursor-pointer ${
            empty ? "text-transparent" : "text-ink"
          }`}
        />
        {empty && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-nowrap text-sm font-semibold text-muted">
            Elegir día
          </span>
        )}
      </span>
    </div>
  );
}
