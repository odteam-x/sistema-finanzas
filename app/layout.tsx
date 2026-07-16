import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { ClickSpark } from "@/components/reactbits/ClickSpark";
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
    statusBarStyle: "default",
    title: "Cachin'",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#127478",
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
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
        <ClickSpark />
        <PWARegister />
      </body>
    </html>
  );
}
