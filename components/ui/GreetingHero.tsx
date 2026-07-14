"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { readProfile } from "@/lib/profile";

interface GreetingHeroProps {
  subtitle: string;
  action?: React.ReactNode;
  /** Nombre desde la BD (fuente de verdad, sin parpadeo en SSR). Si no
   *  llega todavía, se usa el espejo en localStorage como respaldo. */
  displayName?: string;
}

function timeGreeting(): string {
  const h = new Date().getHours();
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
    <header className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={34}
          height={34}
          className="shrink-0 lg:hidden"
          priority
        />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink truncate">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="text-sm text-muted mt-0.5">{subtitle}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
