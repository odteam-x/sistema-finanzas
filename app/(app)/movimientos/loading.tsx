import { PageSkeleton } from "@/components/ui/Skeleton";

// Sin este archivo la ruta no tiene limite de Suspense: Next se queda en la
// pantalla ANTERIOR hasta que el servidor responde, asi que tocar la pestana
// parecia no hacer nada. Movimientos es una pestana principal de la barra.
export default function Loading() {
  return <PageSkeleton tiles={2} />;
}
