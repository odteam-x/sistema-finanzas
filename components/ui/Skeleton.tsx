import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-black/[0.07]", className)}
      aria-hidden="true"
    />
  );
}

/** Esqueleto genérico de página (cabecera + tarjetas) mientras cargan datos. */
export function PageSkeleton({ tiles = 2 }: { tiles?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      {/* Cabecera */}
      <div className="flex items-end justify-between mb-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Array.from({ length: tiles }).map((_, i) => (
          <div key={i} className="glass rounded-[var(--radius-glass-sm)] p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Tarjeta grande */}
      <div className="glass rounded-[var(--radius-glass)] p-5 mb-4">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-2.5 w-full mb-3" />
        <Skeleton className="h-2.5 w-full mb-3" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>

      {/* Filas */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass rounded-[var(--radius-glass)] p-4 flex items-center gap-3">
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
