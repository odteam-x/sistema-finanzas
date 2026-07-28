import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { requireUser } from "@/lib/auth";
import { getSavingsAccounts } from "@/lib/data";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { QuickAddFab } from "@/components/nav/QuickAddFab";
import { PersonalizeProvider } from "@/components/theme/PersonalizeContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PendingSyncBanner } from "@/components/PendingSyncBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
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
  const [user, accounts] = await Promise.all([requireUser(), getSavingsAccounts()]);
  const email = user.email ?? null;

  return (
    <PersonalizeProvider>
      <ToastProvider>
        <AppLockGate>
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
            <main className="flex-1 min-w-0 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-28 lg:pb-10 print:pb-0 print:max-w-none">
              {children}
            </main>
            <div className="print:hidden">
              <BottomTabBar email={email} fab={<QuickAddFab accounts={accounts} />} />
            </div>
          </div>
          <div className="print:hidden">
            <AssistantWidget />
          </div>
        </AppLockGate>
      </ToastProvider>
    </PersonalizeProvider>
  );
}
