import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { AuthShell } from "../AuthShell";
import { AuthForm } from "../AuthForm";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Recuperar contraseña · Cachin'" };

export default function RecuperarPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviamos un enlace para elegir una nueva"
      links={[{ href: "/login", label: "Volver a entrar" }]}
    >
      <AuthForm action={requestPasswordReset} submitLabel="Enviar enlace" variant="reset" />
    </AuthShell>
  );
}
