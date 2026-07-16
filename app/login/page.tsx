import Image from "next/image";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar · Cachin'" };

export default function LoginPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <div className="min-h-dvh grid place-items-center p-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Image
            src="/icons/icon-192.png"
            alt="Cachin'"
            width={100}
            height={100}
            className="mb-2 drop-shadow-sm"
            priority
          />
          <h1 className="text-2xl font-extrabold text-ink">Cachin&apos;</h1>
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
