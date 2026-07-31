"use client";

// global-error.tsx reemplaza el <html>/<body> ENTERO cuando el error ocurre
// en el layout raíz (app/layout.tsx) — a diferencia de app/(app)/error.tsx,
// que solo cubre errores dentro del grupo (app). Sin este archivo, un error
// ahí arriba mostraría la pantalla genérica sin estilo de Next.js. Por eso
// importa sus propios estilos/fuente en vez de heredarlos del layout que
// falló.
import { Outfit } from "next/font/google";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh" suppressHydrationWarning>
        <div className="min-h-dvh grid place-items-center p-5">
          <Card raised className="max-w-md w-full text-center">
            <span className="grid place-items-center size-12 rounded-tile bg-tint-danger text-danger mx-auto mb-3">
              <Icon name="alert" size={26} />
            </span>
            <h1 className="text-xl font-extrabold text-ink">Algo salió mal</h1>
            <p className="text-sm text-muted mt-1 mb-5">
              No pudimos cargar la aplicación. Intenta de nuevo.
            </p>
            <Button onClick={reset} full>
              Reintentar
            </Button>
          </Card>
        </div>
      </body>
    </html>
  );
}
