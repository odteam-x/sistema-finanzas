import { PageSkeleton } from "@/components/ui/Skeleton";

// Las paginas de esta ruta son Server Components que consultan Supabase, asi
// que sin este limite de Suspense la navegacion se queda en la pantalla
// anterior hasta que responde la base y parece que no paso nada al tocar.
//
// La forma tiene que ser la de la pagina real, o el esqueleto deja de ser una
// promesa y pasa a ser una pantalla distinta que dura medio segundo:
// dos tiles apilados: te deben y prestaste.
export default function Loading() {
  return <PageSkeleton stackedTiles />;
}
