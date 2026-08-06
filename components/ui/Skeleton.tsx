import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-tile bg-surface-sunken", className)}
      aria-hidden="true"
    />
  );
}

/** Esqueleto genérico de página (cabecera + tarjetas) mientras cargan datos. */
export function PageSkeleton({
  hero = false,
  tiles = 2,
  stackedTiles = false,
}: {
  /** La pantalla abre con el bloque de marca a ancho completo. */
  hero?: boolean;
  tiles?: number;
  /** Los tiles van uno debajo de otro y no en rejilla de dos columnas. */
  stackedTiles?: boolean;
}) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      {/* Cabecera */}
      <div className="flex items-end justify-between mb-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-24 rounded-pill" />
      </div>

      {/* HERO. Seis pantallas abren con el bloque saturado a ancho completo
          —Balance, Ingresos, Metas, Reportes, Calculadora y Deudas— y el
          esqueleto seguía dibujando ahí una rejilla de dos tiles. Al llegar
          los datos, todo lo de abajo pegaba un salto.

          Un esqueleto que no tiene la forma de lo que viene no es una
          promesa: es una pantalla distinta que dura medio segundo. */}
      {hero && (
        <div className="rounded-card p-4 sm:p-5 mb-4 flex items-center justify-between gap-3 bg-surface-sunken">
          <div className="flex flex-col gap-2.5 flex-1">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="size-14 rounded-pill shrink-0" />
        </div>
      )}

      {/* Tiles. Con tiles=0 no se dibuja nada: un contenedor vacio con su
          margen abajo desplaza todo lo demas y reintroduce el salto que este
          esqueleto existe para evitar. */}
      {tiles > 0 && (
        <div
          className={
            stackedTiles ? "flex flex-col gap-2.5 mb-4" : "grid grid-cols-2 gap-3 mb-4"
          }
        >
          {Array.from({ length: tiles }).map((_, i) => (
            <div key={i} className="card rounded-tile p-4">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Tarjeta grande */}
      <div className="card rounded-card p-5 mb-4">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-2.5 w-full mb-3" />
        <Skeleton className="h-2.5 w-full mb-3" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>

      {/* Filas */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card rounded-card p-4 flex items-center gap-3">
            <Skeleton className="size-10 rounded-pill shrink-0" />
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
