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
          /* touch-target: medido en las 14 pantallas, estos enlaces salen entre
             20 y 24px de alto. La exención de WCAG 2.5.8 para enlaces en línea
             NO aplica: no van dentro de una frase, son un control suelto al
             final de una fila, y se tocan igual que un botón.
             Sube solo la zona sensible; el texto no cambia de tamaño ni de
             peso, que es lo que lo mantiene subordinado al título. */
          <Link
            href={href}
            className="touch-target text-sm font-semibold text-primary-fg shrink-0"
          >
            {linkLabel}
          </Link>
        ))}
    </div>
  );
}
