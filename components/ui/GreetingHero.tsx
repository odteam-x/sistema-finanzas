"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { readProfile } from "@/lib/profile";
import { hourInDR } from "@/lib/time";

interface GreetingHeroProps {
  subtitle: string;
  action?: React.ReactNode;
  /** Nombre desde la BD (fuente de verdad, sin parpadeo en SSR). Si no
   *  llega todavía, se usa el espejo en localStorage como respaldo. */
  displayName?: string;
}

function timeGreeting(): string {
  // Hora de RD, no la del dispositivo (que puede estar mal configurado).
  const h = hourInDR();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function subscribeNoop() {
  return () => {};
}

/** Encabezado del Resumen: saludo personalizado con el nombre guardado en
 *  Personalizar. Primer render (servidor y cliente antes de hidratar):
 *  saludo neutral "Hola" (no depende de la hora, evita mismatch); tras
 *  montar, useSyncExternalStore sube de nivel a un saludo por hora del
 *  día en un solo render extra, sin el patrón setState-dentro-de-effect. */
export function GreetingHero({ subtitle, action, displayName }: GreetingHeroProps) {
  const greeting = useSyncExternalStore(subscribeNoop, timeGreeting, () => "Hola");
  // Init perezoso (seguro: en el servidor no hay localStorage, readProfile
  // devuelve el default; el nombre no depende de la hora, así que no hay
  // riesgo de mismatch de hidratación aquí — mismo patrón que ThemeButton).
  const [localName] = useState<string>(() => readProfile().displayName);
  const name = displayName || localName;

  return (
    <header
      className="glass-nav sticky z-30 mb-4 flex items-center justify-between gap-3 rounded-[28px] border px-4 py-3 shadow-lg shadow-black/10"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink truncate">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="text-sm text-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {/* El isotipo solo vive acá (Inicio), no en cada pantalla — un
         *  círculo pequeño a la derecha, como el ícono de perfil/notificación
         *  de apps de referencia, en vez de flotar centrado compitiendo con
         *  el título. */}
        <Image
          src="/icons/logo-mark-white.png"
          alt="Cachin'"
          width={40}
          height={40}
          className="rounded-full bg-gradient-brand p-2 shadow-md shadow-black/15"
          priority
        />
      </div>
    </header>
  );
}
