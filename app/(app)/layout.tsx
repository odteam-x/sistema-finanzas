import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { requireUser } from "@/lib/auth";
import { getSavingsAccounts, getUserProfile } from "@/lib/data";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { QuickAddFab } from "@/components/nav/QuickAddFab";
import { PersonalizeProvider } from "@/components/theme/PersonalizeContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PendingSyncBanner } from "@/components/PendingSyncBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { AppLockGate } from "@/components/AppLockGate";
import { StatusBarColor } from "@/components/StatusBarColor";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  // Las dos consultas van EN PARALELO (antes iban en serie: dos viajes de red
  // seguidos con la pantalla en blanco, porque loading.tsx cubre la página
  // pero no el layout que la envuelve).
  //
  // Y van las dos aquí, sin <Suspense>: aislar el FAB en un límite de Suspense
  // pintaba la cáscara antes, sí, pero dejaba el stream de HTML abierto hasta
  // que resolvía la consulta — y React no termina de hidratar hasta que el
  // stream cierra. Resultado: la pantalla se veía lista y no respondía, así que
  // el primer toque no hacía nada y había que tocar dos veces. Es peor que
  // esperar: un blanco honesto se entiende, una pantalla muerta no.
  const [user, accounts, profile] = await Promise.all([
    requireUser(),
    getSavingsAccounts(),
    getUserProfile(),
  ]);
  const email = user.email ?? null;

  return (
    <PersonalizeProvider accountTextScale={profile?.text_scale}>
      <ToastProvider>
        {/* El re-bloqueo por inactividad solo aplica si el código está activo;
            es estado de la CUENTA, así que llega del servidor y no de
            localStorage como antes. */}
        <AppLockGate codeActive={profile?.personal_code_active ?? false}>
          <StatusBarColor />
          <div className="fixed top-0 inset-x-0 z-[100] flex flex-col print:hidden">
            <OfflineBanner />
            <PendingSyncBanner />
          </div>
          <div className="lg:flex">
            <div className="print:hidden">
              <Sidebar email={email} />
            </div>
            {/* Sin transición de página: animaba opacity con key={pathname},
                o sea que remontaba el árbol entero en cada navegación y le
                sumaba 220ms de fundido a algo que ya tarda. La navegación
                debe sentirse inmediata, no coreografiada. */}
            {/* max-w-md (448px), no max-w-3xl (768px): la app es de teléfono
                —el manifest la fija en portrait— y estirar el contenido hasta
                768px en un monitor no daba más información, solo filas más
                largas que recorrer con la vista. El margen lateral se queda
                fijo en 16px; el sm:px-6 (24px) que había contradecía la escala
                de espaciado. `print:max-w-none` sigue liberando el ancho al
                imprimir, que es donde sí hace falta. */}
            <main className="flex-1 min-w-0 w-full max-w-md mx-auto px-4 pb-28 lg:pb-10 print:pb-0 print:max-w-none">
              {children}
            </main>
            <div className="print:hidden">
              <BottomTabBar email={email} fab={<QuickAddFab accounts={accounts} />} />
            </div>
          </div>
        </AppLockGate>
      </ToastProvider>
    </PersonalizeProvider>
  );
}
