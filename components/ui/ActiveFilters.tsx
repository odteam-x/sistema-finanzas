import Link from "next/link";
import { Icon } from "./Icon";

export interface ActiveFilter {
  /** Lo que el usuario reconoce, no el nombre técnico: "Solo gastos",
   *  "27 de julio", no "tipo=gastos". */
  label: string;
  /** A dónde se va al quitar SOLO este filtro. */
  removeHref: string;
}

/** Barra de "estás viendo esto". Aparece únicamente cuando hay algún filtro
 *  puesto, así que su sola presencia ya dice que la lista de abajo no es todo.
 *
 *  Existe porque con los filtros aplicados la pantalla se veía idéntica a la
 *  pantalla sin filtrar: los mismos totales, la misma lista, sin nada que
 *  avisara de que faltaban cosas ni por dónde salir. Cada filtro se quita por
 *  separado y hay una salida a "sin filtros" — no hay que adivinar cuál de
 *  los controles de arriba fue el que recortó la vista. */
export function ActiveFilters({
  filters,
  clearHref,
}: {
  filters: ActiveFilter[];
  /** URL de la pantalla sin ningún filtro. */
  clearHref: string;
}) {
  if (filters.length === 0) return null;

  return (
    <section
      aria-label="Filtros activos"
      className="mb-4 rounded-tile border border-primary-fg bg-tint-brand p-3"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-fg uppercase tracking-wide">
          <Icon name="search" size={14} />
          Viendo solo
        </span>

        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.removeHref}
            // El chip ENTERO es el botón de quitar: en un teléfono una "x" de
            // 12px dentro de un chip es un blanco imposible de acertar.
            aria-label={`Quitar filtro: ${f.label}`}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface border border-line-strong px-3 min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken transition-colors"
          >
            {f.label}
            <Icon name="close" size={14} className="text-muted shrink-0" />
          </Link>
        ))}

        {filters.length > 1 && (
          <Link
            href={clearHref}
            className="inline-flex items-center min-h-11 px-2 text-sm font-bold text-primary-fg"
          >
            Quitar todo
          </Link>
        )}
      </div>
    </section>
  );
}
