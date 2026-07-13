import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { ClickSpark } from "@/components/reactbits/ClickSpark";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bolsillo Seguro",
  description:
    "Control de finanzas personales: sueldo, presupuesto diario, ahorros, metas y deudas.",
  applicationName: "Bolsillo Seguro",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bolsillo Seguro",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4efe3",
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
    <html lang="es" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
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
