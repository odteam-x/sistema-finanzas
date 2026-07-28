import { Skeleton } from "@/components/ui/Skeleton";

/** Esqueleto con la FORMA real del Inicio, no el genérico de página: el
 *  bloque teal a sangre, el saldo, el selector de cuenta a su derecha y la
 *  fila de cuatro acciones. Mientras carga ya se intuye qué va dónde, en vez
 *  de ver cajas grises que no se parecen a la pantalla que viene. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando el inicio">
      {/* El gradiente se pinta de una: es lo que da identidad al arranque. */}
      <header
        className="-mx-4 sm:-mx-6 mb-5 bg-gradient-brand rounded-b-hero px-4 sm:px-6 pb-5"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-pill bg-on-brand-well" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3 w-24 rounded-pill bg-on-brand-well" />
              <div className="h-5 w-28 rounded-pill bg-on-brand-well" />
            </div>
          </div>
          <div className="size-11 rounded-pill bg-on-brand-well" />
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-28 rounded-pill bg-on-brand-well" />
            <div className="h-9 w-44 rounded-pill bg-on-brand-well" />
            <div className="h-3 w-36 rounded-pill bg-on-brand-well" />
          </div>
          <div className="h-11 w-28 rounded-pill bg-on-brand-well" />
        </div>

        <div className="mt-5 grid grid-cols-4 gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="size-12 rounded-tile bg-on-brand-well" />
              <div className="h-3 w-12 rounded-pill bg-on-brand-well" />
            </div>
          ))}
        </div>
      </header>

      <div className="px-1 mb-2.5">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="card rounded-card p-5 mb-6 flex flex-col gap-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      <div className="px-1 mb-2.5">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card rounded-tile p-3.5">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>

      <div className="px-1 mb-2.5">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="card rounded-card p-4 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-pill shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
