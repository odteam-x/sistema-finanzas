"use client";

import { useState } from "react";
import { Card } from "./Card";
import { Icon } from "./Icon";

interface CollapsibleCardProps {
  title: string;
  /** Una línea que resume el contenido cuando está cerrado (ej. "Neto:
   *  +RD$500") — así cerrar la tarjeta no esconde el dato, solo el detalle. */
  summary?: React.ReactNode;
  /** Enlace secundario (ej. "Ver todos") — se queda visible siempre, abierto
   *  o cerrado, porque es una salida a otra pantalla, no parte del detalle. */
  action?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Tarjeta con divulgación progresiva: título + resumen de una línea
 *  siempre visibles, el detalle se expande al tocar. Mismo patrón que ya
 *  usaba DailySpendCalculator — se comparte acá para no repetirlo cada vez
 *  que una sección deja de ser "lo más accionable" y pasa a ser contexto
 *  secundario (ver Bloque 3: Inicio/Movimientos/Presupuesto mostraban todo
 *  siempre expandido, compitiendo por atención con el mismo peso visual). */
export function CollapsibleCard({
  title,
  summary,
  action,
  defaultOpen = false,
  className,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className={className}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 min-w-0 flex-1 min-h-11 -my-1 text-left cursor-pointer"
          aria-expanded={open}
        >
          <Icon
            name={open ? "chevronDown" : "chevronRight"}
            size={18}
            className="text-muted shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="font-bold text-ink">{title}</span>
            {summary && !open && (
              <span className="block text-sm text-muted truncate">{summary}</span>
            )}
          </span>
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {open && <div className="mt-3">{children}</div>}
    </Card>
  );
}
