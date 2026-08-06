import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isPersonalCodeConfigured } from "@/lib/personalCodeCrypto";
import { Card } from "@/components/ui/Card";
import { RecoverCodeForm } from "./RecoverCodeForm";

export const metadata = { title: "Recuperar código · Cachin'" };

/** Recuperar el código olvidado. Está exenta del gate (CODE_EXEMPT_PATHS en
 *  lib/supabase/middleware.ts) por lo obvio: si el gate la bloqueara, quien
 *  olvidó su código no podría llegar nunca a recuperarlo. Lo que sí exige es
 *  la contraseña de la cuenta, dentro de las propias acciones. */
export default async function RecuperarCodigoPage() {
  await requireUser();
  if (!isPersonalCodeConfigured()) redirect("/dashboard");

  return (
    <div className="min-h-dvh grid place-items-center p-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-extrabold text-ink">¿Olvidaste tu código?</h1>
          <p className="text-sm text-muted mt-1">
            Confirma tu contraseña y elige qué prefieres hacer.
          </p>
        </div>

        <Card raised>
          <RecoverCodeForm />
        </Card>

        <div className="mt-4 text-center">
          <Link href="/verificar" className="touch-target text-sm font-semibold text-primary-fg">
            Volver
          </Link>
        </div>
      </div>
    </div>
  );
}
