import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthShell } from "@/app/login/AuthShell";
import { AuthForm } from "@/app/login/AuthForm";
import { updatePassword } from "@/app/login/actions";

export const metadata = { title: "Nueva contraseña · Cachin'" };

/** Segundo paso de la recuperación. Se llega desde /auth/callback, que ya
 *  canjeó el código del correo por una sesión — por eso acá basta con
 *  comprobar que hay sesión: quien no venga del enlace no la tiene. */
export default async function NuevaContrasenaPage() {
  const user = await getUser();
  if (!user) redirect("/login?error=enlace-vencido");

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elige una contraseña que no uses en otro sitio"
    >
      <AuthForm action={updatePassword} submitLabel="Guardar contraseña" variant="new-password" />
    </AuthShell>
  );
}
