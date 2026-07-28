"use client";

import { useLinkStatus } from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/** Ícono de un enlace de navegación que se atenúa y gira mientras Next
 *  resuelve ESA navegación en concreto.
 *
 *  `useLinkStatus()` solo existe dentro de un `<Link>` y reporta el estado
 *  de ESE enlace, no un estado global — así que basta con montarlo como hijo
 *  directo del Link que se tocó, sin contexto ni efecto (el proyecto trata
 *  `react-hooks/set-state-in-effect` como error).
 *
 *  Por qué hacía falta: entre que la URL cambia (de inmediato) y que la
 *  pantalla nueva está lista (cientos de ms, más con arranque en frío o
 *  ida y vuelta a Supabase), no había NINGUNA señal de que el toque hubiera
 *  registrado — se sentía como si hubiera que tocar dos veces. */
export function NavIcon({
  name,
  size,
  active,
}: {
  name: IconName;
  size: number;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  return (
    <span className="relative inline-flex shrink-0">
      <Icon
        name={name}
        size={size}
        weight={active ? "fill" : "light"}
        className={cn("transition-opacity", pending && "opacity-40")}
      />
      {pending && (
        <span
          aria-hidden="true"
          className="absolute -inset-1.5 rounded-pill border-2 border-current border-t-transparent animate-spin"
        />
      )}
    </span>
  );
}
