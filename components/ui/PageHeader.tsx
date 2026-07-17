import { BackButton } from "./BackButton";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Oculta el botón de volver — solo para pantallas raíz (Inicio). */
  showBack?: boolean;
}

/** Barra simple (no una tarjeta flotante) pegada arriba de cada pantalla,
 *  edge-to-edge: en un dispositivo con notch/Dynamic Island, una forma
 *  redondeada "flotando" cerca del borde superior se ve mal recortada por
 *  esa curva — una barra plana con suficiente padding-top de safe-area no
 *  choca con nada. Sigue siendo `sticky` para no perder de vista en qué
 *  sección estás al hacer scroll. Dos zonas simples (título a la izq.,
 *  acción a la der.) — el isotipo no se repite en cada pantalla (competía
 *  con el título/la acción); vive solo en GreetingHero, la de Inicio.
 *  Requiere que ningún ancestro anime `transform` (ver PageTransition.tsx
 *  — solo anima opacity). */
export function PageHeader({ title, subtitle, action, showBack = true }: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 mb-3 flex items-center justify-between gap-2 bg-[var(--color-bg)]/85 backdrop-blur-md"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-1 min-w-0">
        {showBack && <BackButton />}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink truncate">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {/* grid (no flex): el trigger="pill" de FormModal trae su propia clase
          flex-1 pensada para filas de píldoras que llenan el ancho — en un
          padre flex eso estira el botón a todo el alto de la columna. En un
          padre grid, flex-grow no aplica a los grid items, así que el botón
          conserva su ancho natural sin tocar FormModal. */}
      {action && <div className="grid justify-items-end shrink-0">{action}</div>}
    </header>
  );
}
