import Link from "next/link";
import { cn } from "@/lib/cn";

export interface Segment {
  label: string;
  href: string;
  active: boolean;
}

/** Grupo de pestañas que navegan (no cambian estado en cliente), por eso no
 *  usa el `Tabs` de Radix: aquí cada opción es una URL distinta y el
 *  servidor decide qué se pinta.
 *
 *  Existe para que estos grupos dejen de armarse a mano en cada pantalla con
 *  clases distintas — y sobre todo con alturas por debajo del mínimo táctil:
 *  la versión anterior de Cobros medía 33px. */
export function SegmentedLinks({ label, segments }: { label: string; segments: Segment[] }) {
  return (
    <nav
      aria-label={label}
      className="inline-flex gap-1 rounded-pill border border-line bg-surface-sunken p-1"
    >
      {segments.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          aria-current={s.active ? "page" : undefined}
          className={cn(
            "flex items-center rounded-pill px-4 min-h-11 text-xs font-semibold transition-colors",
            s.active
              ? "bg-surface text-ink shadow-card"
              : "text-muted hover:text-ink",
          )}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
