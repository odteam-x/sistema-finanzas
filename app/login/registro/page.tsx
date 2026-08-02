import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { AuthShell } from "../AuthShell";
import { AuthForm } from "../AuthForm";
import { signup } from "../actions";

export const metadata = { title: "Crear cuenta · Cachin'" };

export default function RegistroPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Tus datos son solo tuyos: cada cuenta ve únicamente lo suyo"
      links={[{ href: "/login", label: "Ya tengo cuenta" }]}
    >
      <AuthForm action={signup} submitLabel="Crear cuenta" variant="signup" />
    </AuthShell>
  );
}
