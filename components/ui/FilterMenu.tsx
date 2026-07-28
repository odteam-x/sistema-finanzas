import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./DropdownMenu";

export interface FilterOption {
  label: string;
  href: string;
  active?: boolean;
  /** Opción sin datos suficientes: se muestra pero no navega, con el motivo
   *  en el title (ej. "aún no tienes 12 meses de historial"). */
  disabled?: boolean;
  disabledReason?: string;
}

/** Selector compacto de filtro. Existe para que una pantalla no acumule
 *  tres controles distintos con tres pesos visuales distintos: Reportes
 *  tenía dos filas de píldoras rellenas (que competían con la acción
 *  primaria) más un dropdown. Todos los filtros son secundarios, así que
 *  todos se ven igual: superficie sólida, sin gradiente, sin relleno de
 *  marca. El valor activo se lee en el propio disparador. */
export function FilterMenu({
  label,
  value,
  options,
  align = "start",
}: {
  /** Se anuncia a lectores de pantalla; en pantalla manda el valor. */
  label: string;
  value: string;
  options: FilterOption[];
  align?: "start" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${label}: ${value}`}
        className="inline-flex items-center gap-1.5 rounded-pill border border-line-strong bg-surface px-3.5 min-h-11 text-sm font-semibold text-ink cursor-pointer hover:bg-surface-sunken transition-colors"
      >
        {value}
        <Icon name="chevronDown" size={14} className="text-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {options.map((o) =>
          o.disabled ? (
            <DropdownMenuItem key={o.href + o.label} disabled title={o.disabledReason}>
              <span className="text-subtle">{o.label}</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={o.href + o.label} asChild>
              <Link href={o.href} className={cn(o.active && "font-bold text-primary-fg")}>
                {o.label}
              </Link>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
