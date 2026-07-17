import Image from "next/image";
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
 *  El isotipo va siempre centrado como ancla de marca. Requiere que ningún
 *  ancestro anime `transform` (ver PageTransition.tsx — solo anima opacity). */
export function PageHeader({ title, subtitle, action, showBack = true }: PageHeaderProps) {
  return (
    <header
      className="glass-nav sticky z-30 mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[28px] border px-3 sm:px-4 py-3 shadow-lg shadow-black/10"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-1 min-w-0 justify-self-start">
        {showBack && <BackButton />}
        <div className="min-w-0">
          <h1 className="text-[1.75rem] sm:text-4xl font-extrabold tracking-tight text-ink truncate">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <Image
        src="/icons/logo-mark.png"
        alt="Cachin'"
        width={36}
        height={36}
        className="justify-self-center shrink-0 h-8 w-8 sm:h-9 sm:w-9"
        priority
      />
      <div className="flex items-center justify-end justify-self-end shrink-0">{action}</div>
    </header>
  );
}
