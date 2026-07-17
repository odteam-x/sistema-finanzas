import { BackButton } from "./BackButton";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Oculta el botón de volver — solo para pantallas raíz (Inicio). */
  showBack?: boolean;
}

/** Flotante (sticky con separación del borde) arriba de cada pantalla: nunca
 *  pierdes de vista en qué sección estás al hacer scroll, con el mismo
 *  lenguaje visual que BottomTabBar (glass-nav + borde + sombra + margen).
 *  Dos zonas simples (título a la izq., acción a la der.) — el isotipo ya
 *  no se repite en cada pantalla (competía con el título/la acción); vive
 *  solo en GreetingHero, la pantalla de Inicio. Requiere que ningún
 *  ancestro anime `transform` (ver PageTransition.tsx — solo anima opacity). */
export function PageHeader({ title, subtitle, action, showBack = true }: PageHeaderProps) {
  return (
    <header
      className="glass-nav sticky z-30 mb-4 flex items-center justify-between gap-2 rounded-[28px] border px-3 sm:px-4 py-3 shadow-lg shadow-black/10"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
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
