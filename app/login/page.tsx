import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { Icon } from "@/components/ui/Icon";
import { AuthShell } from "./AuthShell";
import { AuthForm } from "./AuthForm";
import { login } from "./actions";

export const metadata = { title: "Entrar · Cachin'" };

/** Los enlaces de correo vencen y son de un solo uso; abrirlos dos veces es
 *  el caso normal, no un fallo. Se explica acá en vez de dejar al usuario en
 *  un login mudo preguntándose si hizo algo mal. */
const LINK_ERRORS: Record<string, string> = {
  "enlace-invalido": "Ese enlace no es válido. Pide uno nuevo.",
  "enlace-vencido": "Ese enlace ya venció o se usó. Pide uno nuevo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const sp = await searchParams;
  const linkError = sp.error ? LINK_ERRORS[sp.error] : null;

  return (
    <AuthShell
      title="Cachin'"
      subtitle="Entra para ver tu resumen financiero"
      links={[
        { href: "/login/recuperar", label: "¿Olvidaste tu contraseña?" },
        { href: "/login/registro", label: "Crear una cuenta" },
      ]}
    >
      {linkError && (
        <p
          className="mb-4 text-sm font-medium text-danger bg-tint-danger rounded-tile px-3 py-2 flex items-center gap-2"
          role="alert"
        >
          <Icon name="alert" size={18} />
          {linkError}
        </p>
      )}
      <AuthForm action={login} submitLabel="Entrar" variant="login" />
    </AuthShell>
  );
}
