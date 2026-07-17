"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Icon } from "./Icon";

/** Caja de búsqueda de texto libre: el estado vive en la URL (?q=), mismo
 *  patrón que los demás filtros de la app (rango, categoría) — permite
 *  compartir/recargar con el filtro puesto y no depende de estado cliente
 *  para lo demás de la página (server component). */
export function SearchBar({ placeholder = "Buscar…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  // Resincroniza si la URL cambia por fuera de este input (atrás/adelante
  // del navegador) — ajuste durante el render, no en un efecto, para no
  // disparar un segundo render en cascada (regla react-hooks/set-state-in-effect).
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setValue(urlQ);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);
  }

  return (
    <div className="relative">
      <Icon
        name="search"
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-11 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] pl-10 pr-3.5 text-ink placeholder:text-muted/60 shadow-inner focus:outline-none focus:border-primary focus:bg-[var(--input-bg-focus)] transition-colors"
      />
    </div>
  );
}
