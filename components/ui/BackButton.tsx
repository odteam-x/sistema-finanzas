"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Volver"
      /* touch-target: el chevron sigue midiendo 36x36 —no debe pesar mas que
         el titulo que tiene al lado— pero la zona sensible al toque sube a
         44x44. Aparece en 13 de las 14 pantallas, asi que es el objetivo
         pequeno mas repetido de la app. */
      className="touch-target grid place-items-center size-9 -ml-1.5 rounded-pill text-ink hover:bg-surface-sunken cursor-pointer shrink-0 active:scale-[0.97] transition-transform"
    >
      <Icon name="chevronLeft" size={22} />
    </button>
  );
}
