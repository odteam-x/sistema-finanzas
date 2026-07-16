import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { requireUser } from "@/lib/auth";
import { getSavingsAccounts } from "@/lib/data";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { PageTransition } from "@/components/PageTransition";
import { PersonalizeProvider } from "@/components/theme/PersonalizeContext";

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
      <div className="lg:flex">
        <Sidebar email={email} />
        <main className="flex-1 min-w-0 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-28 lg:pb-10">
          <PageTransition>{children}</PageTransition>
        </main>
        <BottomTabBar email={email} accounts={accounts} />
      </div>
    </PersonalizeProvider>
  );
}
