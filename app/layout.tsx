import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { SplashScreen } from "@/components/SplashScreen";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

// Outfit: geométrica y con más carácter que Plus Jakarta Sans — la spec de
// Fase 5 pedía Satoshi/General Sans (Fontshare, requieren alojar los
// archivos de fuente); esta es la alternativa más cercana disponible sin
// depender de un CDN externo ni archivos binarios en el repo.
const outfit = Outfit({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cachin'",
  description:
    "Control de finanzas personales: sueldo, presupuesto diario, ahorros, metas y deudas.",
  applicationName: "Cachin'",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // "default" pinta la franja de la barra de estado BLANCA fija en iOS,
    // sin importar el tema de la app — es justo la discrepancia reportada
    // (arriba blanco/negro fijo, el resto de la pantalla en su tema real).
    // "black-translucent" la vuelve transparente: se ve a través de ella el
    // contenido real de la página, que StatusBarColor.tsx ya tiñe según ruta
    // y tema. Los headers de la app ya reservan
    // `env(safe-area-inset-top)` (ver PageHeader.tsx, HomeHero.tsx), así que
    // el contenido no queda tapado por el reloj/batería del sistema.
    statusBarStyle: "black-translucent",
    title: "Cachin'",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Valor de arranque, antes de que hidrate StatusBarColor (que lo ajusta por
  // ruta): el tope de pantalla es el gradiente de marca en Inicio —que es el
  // start_url— y el fondo de página en el resto. Se declara por esquema para
  // que el modo oscuro no arranque con una franja clara.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0c4c4f" },
    { media: "(prefers-color-scheme: dark)", color: "#0d5457" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes del primer pintado (evita flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* Se retiró ClickSpark (la chispa en cada toque): era un canvas a
          pantalla completa que se limpiaba y redibujaba en cada frame tras
          CADA toque, y que además leía getComputedStyle(<html>) dentro del
          bucle de animación — un recálculo de estilo por frame. Un adorno no
          puede costar fluidez justo en el momento en que tocas algo. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {/* Va en el layout RAÍZ, no en el de (app): así cubre también el
            login, y Next no lo remonta al navegar entre secciones — la
            animación no se repite en cada tap. */}
        <SplashScreen />
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
