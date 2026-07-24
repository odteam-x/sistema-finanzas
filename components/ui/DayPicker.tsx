"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Icon } from "./Icon";

/** R06: elegir un día concreto para ver solo sus movimientos. Igual que
 *  SearchBar, el estado vive en la URL (?dia=) para que se pueda compartir
 *  y recargar con el filtro puesto. Al elegir día se limpia el preset de
 *  rango, que ya no aplica. */
export function DayPicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("dia", next);
      params.delete("range");
    } else {
      params.delete("dia");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="glass inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold text-ink cursor-pointer">
      <Icon name="calendar" size={14} />
      <span className="sr-only">Ver un día específico</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs font-semibold text-ink focus:outline-none cursor-pointer"
      />
    </label>
  );
}
