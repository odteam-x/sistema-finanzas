import Link from "next/link";
import { cn } from "@/lib/cn";

interface SectionHeadProps {
  title: string;
  /** Línea de apoyo bajo el título, cuando la sección necesita explicarse. */
  subtitle?: string;
  /** Enlace de "ver más" a la derecha. El caso más común. */
  href?: string;
  linkLabel?: string;
  /** Cualquier otra cosa a la derecha: un botón de añadir, un filtro. Si se
   *  pasan los dos, manda `action`. */
  action?: React.ReactNode;
  /** Para anclas de navegación (#etiquetas) y ajustes de scroll puntuales. */
  id?: string;
  className?: string;
}

/** Encabezado de sección: separa por espacio, no por línea.
 *
 *  Vivía dentro de dashboard/page.tsx, así que las otras ~14 secciones de la
 *  app lo reescribían a mano — y en tres separaciones distintas (px-1 mb-2,
 *  px-1 mb-2.5 y sin nada). Mismo elemento, tres ritmos verticales.
 *
 *  Se queda con mb-2.5, que era el del Inicio: la pantalla más vista es la
 *  que fija el ritmo, no la mayoría numérica. */
export function SectionHead({
  title,
  subtitle,
  href,
  linkLabel,
  action,
  id,
  className,
}: SectionHeadProps) {
  return (
    <div
      id={id}
      className={cn("flex items-center justify-between gap-3 px-1 mb-2.5", className)}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {action ??
        (href && (
          <Link href={href} className="text-sm font-semibold text-primary-fg shrink-0">
            {linkLabel}
          </Link>
        ))}
    </div>
  );
}
