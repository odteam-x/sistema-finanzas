import { cn } from "@/lib/cn";

/** Ilustraciones de unDraw (licencia libre, sin atribución) descargadas a
 *  /public/illustrations con el color de acento fijado dentro de cada SVG
 *  (se cargan vía <img>, donde las variables CSS de la página no aplican). */
export type IllustrationName =
  | "savings"
  | "make-it-rain"
  | "wallet"
  | "goals"
  | "target"
  | "receipt"
  | "subscriptions"
  | "data-reports"
  | "preferences"
  | "calculator"
  | "finance";

interface IllustrationProps {
  name: IllustrationName;
  /** Ancho en px; la altura se ajusta a la proporción del SVG. */
  width?: number;
  className?: string;
  /** Vacío por defecto: son decorativas, el texto del contexto ya describe. */
  alt?: string;
}

export function Illustration({ name, width = 180, className, alt = "" }: IllustrationProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/illustrations/${name}.svg`}
      alt={alt}
      width={width}
      style={{ height: "auto" }}
      loading="lazy"
      decoding="async"
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
