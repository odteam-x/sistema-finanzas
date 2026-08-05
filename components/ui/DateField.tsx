"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "./Icon";
import { baseControl } from "./Field";
import { cn } from "@/lib/cn";
import { monthGrid } from "@/lib/calendar";
import { formatDateLong, parseISODate, todayISO } from "@/lib/format";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1, 12).toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
}

interface DateFieldProps {
  id?: string;
  /** Nombre con el que viaja en el formulario. Sin él, el campo es solo de
   *  estado local (ej. los filtros de exportar CSV, que no se envían). */
  name?: string;
  defaultValue?: string;
  /** Modo controlado: si se pasa, manda sobre el estado interno. */
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** Selector de fecha propio: botón + calendario en un diálogo.
 *
 *  Sustituye a `<input type="date">` en TODOS los formularios de la app, por
 *  las mismas razones que ya llevaron a escribir DayPicker para el filtro de
 *  Movimientos: el control nativo confirma al primer toque en Android —el
 *  "autoclick"— y en iOS recorta a min/max disparando un cambio con una fecha
 *  que el usuario nunca eligió. Se intentó domarlo dos veces; el problema es
 *  del control, no del uso.
 *
 *  A diferencia de DayPicker, este sirve para capturar CUALQUIER fecha, no
 *  solo los días que ya tienen movimientos: trae rejilla de mes con navegación
 *  y por eso puede reemplazar al nativo en un formulario.
 *
 *  SOBRE `required` — el valor viaja en un <input type="hidden">, y los campos
 *  ocultos están excluidos de la validación nativa del navegador, así que el
 *  `required` del HTML no haría nada. Se cumple por construcción: un campo
 *  requerido NO ofrece "Quitar fecha", así que una vez tiene valor no puede
 *  quedarse vacío. Todos los usos requeridos de la app arrancan con la fecha
 *  de hoy, de modo que nunca parten de vacío. Si algún día hiciera falta un
 *  requerido que empiece en blanco, esto habría que resolverlo de otra forma. */
export function DateField({
  id,
  name,
  defaultValue,
  value,
  onChange,
  required,
  disabled,
  className,
  "aria-label": ariaLabel,
}: DateFieldProps) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value !== undefined ? value : internal;

  const [open, setOpen] = useState(false);
  // Mes que se está mirando. Arranca en el de la fecha elegida, o en el de hoy
  // si aún no hay ninguna. Es estado propio: navegar por los meses no cambia
  // la fecha seleccionada hasta que se toca un día.
  const [view, setView] = useState(() => {
    const base = parseISODate(current || todayISO());
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const today = todayISO();
  const weeks = monthGrid(view.year, view.month);

  function commit(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  function openPicker() {
    // Al abrir se vuelve al mes de la fecha elegida: si el usuario navegó a
    // otro mes y cerró sin elegir, no debe reaparecer donde lo dejó.
    const base = parseISODate(current || today);
    setView({ year: base.getFullYear(), month: base.getMonth() });
    setOpen(true);
  }

  function shiftMonth(delta: number) {
    const d = new Date(view.year, view.month + delta, 1, 12);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        id={id}
        onClick={openPicker}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          baseControl,
          "flex items-center justify-between gap-2 text-left cursor-pointer active:scale-[0.97]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !current && "text-muted",
          className,
        )}
      >
        {current ? formatDateLong(current) : "Elegir fecha"}
        <Icon name="calendar" size={16} className="shrink-0 text-muted" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Elegir fecha" compact>
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mes anterior"
            className="grid place-items-center size-11 rounded-pill text-ink hover:bg-surface-sunken cursor-pointer"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <p className="text-sm font-bold text-ink capitalize">
            {monthLabel(view.year, view.month)}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Mes siguiente"
            className="grid place-items-center size-11 rounded-pill text-ink hover:bg-surface-sunken cursor-pointer"
          >
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div
              key={i}
              className={cn(
                "text-center text-xs font-bold py-1",
                i === 6 ? "text-muted" : "text-ink/60",
              )}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((iso, di) => {
                if (!iso) return <div key={di} />;
                const selected = iso === current;
                const isToday = iso === today;
                return (
                  <button
                    key={di}
                    type="button"
                    onClick={() => commit(iso)}
                    aria-label={formatDateLong(iso)}
                    aria-current={selected ? "date" : undefined}
                    className={cn(
                      "grid place-items-center aspect-square rounded-tile text-sm tabular cursor-pointer transition-colors active:scale-[0.97]",
                      selected
                        ? "bg-primary text-on-brand font-bold"
                        : "text-ink hover:bg-surface-sunken",
                      // Hoy se marca con un borde y no con relleno: el relleno
                      // ya significa "elegida" y dos rellenos distintos en la
                      // misma rejilla se leen como dos selecciones.
                      !selected && isToday && "border border-primary-fg font-semibold",
                    )}
                  >
                    {parseISODate(iso).getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => commit(today)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-pill border border-line-strong min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken cursor-pointer"
          >
            Hoy
          </button>
          {/* Solo cuando el campo es opcional: ver la nota sobre `required`
              arriba — es lo que garantiza que un requerido no se vacíe. */}
          {!required && current && (
            <button
              type="button"
              onClick={() => commit("")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-pill border border-line-strong min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken cursor-pointer"
            >
              <Icon name="close" size={16} />
              Quitar fecha
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
