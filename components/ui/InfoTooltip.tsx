"use client";

import { cn } from "@/lib/cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./DropdownMenu";

/** Botón "?" con una explicación corta de cómo sale una cifra.
 *
 *  Por dentro es el DropdownMenu de Radix, no porque esto sea un menú sino
 *  por lo que trae resuelto: portal (los StatTile llevan overflow-hidden y
 *  recortarían cualquier popover posicionado dentro), cierre con Escape y con
 *  toque fuera, y devolución del foco al botón. Se le sobrescribe el `role` a
 *  "dialog" porque un lector de pantalla no debe anunciar como "menú" algo
 *  que solo contiene texto.
 *
 *  Abre por CLIC, no por hover: esto es una PWA móvil y ahí el hover no
 *  existe. El área táctil se agranda con un pseudo-elemento en vez de con
 *  tamaño real, para no descuadrar la fila del label. */
export function InfoTooltip({
  label,
  children,
  className,
}: {
  /** De qué cifra habla — va al aria-label del botón y del popover. */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Cómo se calcula: ${label}`}
          aria-haspopup="dialog"
          className={cn(
            "relative grid place-items-center size-5 shrink-0 rounded-pill",
            "border border-current/40 text-xs font-bold leading-none text-on-tint",
            "before:absolute before:-inset-2.5 before:content-['']",
            "hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer",
            className,
          )}
        >
          ?
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        role="dialog"
        aria-label={label}
        align="end"
        collisionPadding={12}
        className="max-w-[17rem] p-3 text-xs leading-relaxed text-ink"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
