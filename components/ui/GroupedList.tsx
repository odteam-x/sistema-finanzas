import { cn } from "@/lib/cn";

/** Lista agrupada al estilo de Ajustes de iOS: UN contenedor con separadores
 *  internos, en vez de una tarjeta por fila.
 *
 *  El motivo es de deferencia, no de gusto. Cada fila con su propio borde,
 *  padding y sombra convierte una pantalla de quince opciones en quince
 *  unidades compitiendo entre sí; agrupadas se leen como un bloque con quince
 *  entradas, que es lo que son. La separación la hace una línea de 1px, lo
 *  mínimo que distingue sin pesar.
 *
 *  El contenedor recorta con overflow-hidden para que la primera y la última
 *  fila hereden el radio sin tener que redondearlas a mano. */
export function GroupedList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("card rounded-card overflow-hidden divide-y divide-line", className)}>
      {children}
    </ul>
  );
}

/** Una fila. El padding (12px vertical, 16px horizontal) y el alto mínimo de
 *  44px son los de la especificación: el mínimo táctil de HIG aunque la fila
 *  no sea tocable entera, para que todas midan igual. */
export function GroupedListRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("flex items-center gap-3 min-h-11 px-4 py-3", className)}>{children}</li>
  );
}
