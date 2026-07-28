import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { requireUser } from "@/lib/auth";
import { getSavingsAccounts } from "@/lib/data";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { QuickAddFab } from "@/components/nav/QuickAddFab";
import { PageTransition } from "@/components/PageTransition";
import { PersonalizeProvider } from "@/components/theme/PersonalizeContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PendingSyncBanner } from "@/components/PendingSyncBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { AppLockGate } from "@/components/AppLockGate";
import { StatusBarColor } from "@/components/StatusBarColor";

/** El FAB necesita la lista de cuentas para el <select> de sus formularios,
 *  pero la barra de navegación no. Aislarlo en su propio componente async lo
 *  saca de la ruta crítica: la cáscara se pinta con el resto de la barra ya
 *  usable y el botón aparece en cuanto llega la consulta, en vez de que una
 *  consulta a Supabase retrase TODA la interfaz. */
async function FabWithAccounts() {
  const accounts = await getSavingsAccounts();
  return <QuickAddFab accounts={accounts} />;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  // Lo único que bloquea la cáscara es la verificación de sesión (defensa en
  // profundidad, además del middleware) — y va memoizada con cache() de React,
  // así que las páginas y los catch-ups la reusan sin pegar de nuevo a la red.
  // Antes aquí se esperaba ADEMÁS getSavingsAccounts() en serie: dos viajes de
  // red seguidos con la pantalla en blanco, porque loading.tsx cubre la página
  // pero no el layout que la envuelve.
  const user = await requireUser();
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
            <main className="flex-1 min-w-0 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-28 lg:pb-10 print:pb-0 print:max-w-none">
              <PageTransition>{children}</PageTransition>
            </main>
            <div className="print:hidden">
              <BottomTabBar
                email={email}
                fab={
                  <Suspense fallback={null}>
                    <FabWithAccounts />
                  </Suspense>
                }
              />
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
