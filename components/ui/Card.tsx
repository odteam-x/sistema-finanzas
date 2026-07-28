import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Superficie elevada: para lo que flota sobre otra tarjeta o sobre el
   *  fondo con más peso (login, recibo). */
  raised?: boolean;
  /** Quita el padding — para tarjetas que contienen una lista a sangre. */
  flush?: boolean;
  as?: "div" | "section" | "article";
}

/** Superficie de contenido: opaca, esquinas grandes, sombra suave. No hay
 *  vidrio en el sistema — la separación viene del color real de la
 *  superficie, no de dejar ver el fondo a través. */
export function Card({
  raised,
  flush,
  as: Tag = "div",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        raised ? "card-raised" : "card",
        "rounded-card",
        !flush && "p-4 sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
