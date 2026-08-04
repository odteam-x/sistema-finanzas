import { PageSkeleton } from "@/components/ui/Skeleton";

// Las paginas de esta ruta son Server Components que consultan Supabase, asi
// que sin este limite de Suspense la navegacion se queda en la pantalla
// anterior hasta que responde la base y parece que no paso nada al tocar.
//
// tiles=2: los dos totales sobre las graficas. Que el esqueleto tenga la misma forma que
// la pagina real evita el salto de layout al llegar los datos.
export default function Loading() {
  return <PageSkeleton tiles={2} />;
}
