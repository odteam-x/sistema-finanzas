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
      className="glass-nav sticky z-30 mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[28px] border px-3 sm:px-4 py-3 shadow-lg shadow-black/10"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="min-w-0 justify-self-start">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink truncate">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="text-sm text-muted mt-0.5">{subtitle}</p>
      </div>
      <Image
        src="/icons/logo-mark.png"
        alt="Cachin'"
        width={36}
        height={36}
        className="justify-self-center shrink-0 h-8 w-8 sm:h-9 sm:w-9"
        priority
      />
      <div className="grid justify-items-end items-center justify-self-end shrink-0">{action}</div>
    </header>
  );
}
