"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Modal } from "./Modal";
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";
import { formatDateLong } from "@/lib/format";

/** R06: elegir un día concreto para ver solo sus movimientos. El estado vive
 *  en la URL (?dia=) para poder compartir y recargar con el filtro puesto.
 *
 *  Ya NO usa `<input type="date">`. El control nativo confirmaba al primer
 *  toque —el "autoclick" reportado en Android— y en iOS recortaba a `min`/`max`
 *  disparando un onChange con una fecha que el usuario nunca eligió. Se
 *  intentó domarlo dos veces; el problema es del control, no del uso.
 *
 *  Además el calendario nativo ofrece los 365 días del año cuando lo útil es
 *  el puñado que tiene movimientos: esta lista muestra solo esos, agrupados
 *  por mes y del más reciente al más viejo. */
export function DayPicker({
  value,
  /** Días que SÍ tienen movimientos. Si viene vacío no hay nada que elegir. */
  availableDays = [],
}: {
  value: string;
  availableDays?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const byMonth = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const d of [...availableDays].sort().reverse()) {
      const key = d.slice(0, 7);
      const arr = groups.get(key) ?? [];
      arr.push(d);
      groups.set(key, arr);
    }
    return [...groups.entries()];
  }, [availableDays]);

  function pick(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("dia", next);
      params.delete("range");
    } else {
      params.delete("dia");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setOpen(false);
  }

  const disabled = availableDays.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={value ? `Día elegido: ${formatDateLong(value)}. Cambiar` : "Elegir un día"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill border px-3.5 min-h-11 text-sm font-semibold transition-colors cursor-pointer",
          value
            ? "border-primary-fg bg-tint-brand text-primary-fg"
            : "border-line-strong bg-surface text-ink hover:bg-surface-sunken",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <Icon name="calendar" size={15} className="shrink-0" />
        {value ? formatDateLong(value) : "Elegir día"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Elegir día" compact>
        <p className="text-sm text-muted mb-4">
          Solo aparecen los días que tienen movimientos registrados.
        </p>

        {value && (
          <button
            onClick={() => pick("")}
            className="w-full mb-4 inline-flex items-center justify-center gap-1.5 rounded-pill border border-line-strong min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken cursor-pointer"
          >
            <Icon name="close" size={16} />
            Quitar el filtro de día
          </button>
        )}

        <div className="flex flex-col gap-4 max-h-[50dvh] overflow-y-auto">
          {byMonth.map(([month, days]) => (
            <div key={month}>
              <p className="text-xs font-semibold text-muted px-1 mb-1.5 capitalize">
                {new Date(`${month}-01T12:00:00`).toLocaleDateString("es-DO", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <ul className="flex flex-col gap-1">
                {days.map((d) => {
                  const active = d === value;
                  return (
                    <li key={d}>
                      <button
                        onClick={() => pick(d)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-tile px-3 min-h-11 text-sm text-left transition-colors cursor-pointer capitalize",
                          active
                            ? "bg-primary text-on-brand font-bold"
                            : "text-ink hover:bg-surface-sunken",
                        )}
                      >
                        {active && <Icon name="check" size={16} className="shrink-0" />}
                        {formatDateLong(d)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
