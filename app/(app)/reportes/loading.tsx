import { PageSkeleton } from "@/components/ui/Skeleton";

// Las paginas de esta ruta son Server Components que consultan Supabase, asi
// que sin este limite de Suspense la navegacion se queda en la pantalla
// anterior hasta que responde la base y parece que no paso nada al tocar.
//
// su hero cuelga de que haya datos del periodo, asi que el esqueleto no lo promete.
export default function Loading() {
  return <PageSkeleton tiles={2} />;
}
