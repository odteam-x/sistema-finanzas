import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { GlassCard } from "@/components/ui/GlassCard";
import { Icon } from "@/components/ui/Icon";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar · Finanzas" };

export default function LoginPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <div className="min-h-dvh grid place-items-center p-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <span className="grid place-items-center size-14 rounded-3xl bg-primary text-white shadow-lg mb-3">
            <Icon name="wallet" size={28} />
          </span>
          <h1 className="text-2xl font-extrabold text-ink">Finanzas Personales</h1>
          <p className="text-sm text-muted mt-1">
            Entra para ver tu resumen financiero
          </p>
        </div>

        <GlassCard strong className="p-6">
          <LoginForm />
        </GlassCard>

        <p className="text-center text-xs text-muted mt-5">
          Acceso privado · un solo usuario
        </p>
      </div>
    </div>
  );
}
