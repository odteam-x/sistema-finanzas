import { BackButton } from "./BackButton";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Oculta el botón de volver — solo para pantallas raíz (Inicio). */
  showBack?: boolean;
}

/** Fijo (sticky) arriba de cada pantalla: nunca pierdes de vista en qué
 *  sección estás al hacer scroll. Requiere que ningún ancestro anime
 *  `transform` (ver PageTransition.tsx — solo anima opacity por esto). */
export function PageHeader({ title, subtitle, action, showBack = true }: PageHeaderProps) {
  return (
    <header className="glass-nav sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 mb-4 flex items-center justify-between gap-3 border-b">
      <div className="flex items-center gap-1 min-w-0">
        {showBack && <BackButton />}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink truncate">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
