import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { requireUser } from "@/lib/auth";
import { getSavingsAccounts } from "@/lib/data";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { PageTransition } from "@/components/PageTransition";
import { PersonalizeProvider } from "@/components/theme/PersonalizeContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { AppLockGate } from "@/components/AppLockGate";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await requireUser();
  const email = user.email ?? null;
  const accounts = await getSavingsAccounts();

  return (
    <PersonalizeProvider>
      <ToastProvider>
      <AppLockGate>
      <div className="print:hidden">
        <OfflineBanner />
      </div>
      <div className="lg:flex">
        <div className="print:hidden">
          <Sidebar email={email} />
        </div>
        <main className="flex-1 min-w-0 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-28 lg:pb-10 print:pb-0 print:max-w-none">
          <PageTransition>{children}</PageTransition>
        </main>
        <div className="print:hidden">
          <BottomTabBar email={email} accounts={accounts} />
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
