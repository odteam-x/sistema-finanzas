import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isPersonalCodeConfigured } from "@/lib/personalCodeCrypto";
import { Card } from "@/components/ui/Card";
import { VerifyCodeForm } from "./VerifyCodeForm";

export const metadata = { title: "Verificación · Cachin'" };

/** Segundo paso del inicio de sesión. Vive FUERA del grupo (app) a propósito:
 *  no debe traer la navegación, el asistente ni ninguna pantalla con datos —
 *  el usuario todavía no ha pasado el segundo factor. */
export default async function VerificarPage() {
  await requireUser();

  // Si el código no está activo (o la función no está configurada en el
  // servidor) no hay nada que pedir. Quien emite la cookie en ese caso es el
  // proxy, que sí puede escribirla; acá solo se sale del paso.
  if (!isPersonalCodeConfigured()) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profile")
    .select("personal_code_active")
    .maybeSingle();
  if (!data?.personal_code_active) redirect("/dashboard");

  return (
    <div className="min-h-dvh grid place-items-center p-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Image src="/icons/icon-192.png" alt="" width={56} height={56} priority />
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-ink">Ingresa tu código personal</h1>
            <p className="text-sm text-muted mt-1">
              Son 6 dígitos. Te lo pedimos cada vez que inicias sesión.
            </p>
          </div>
        </div>

        <Card raised>
          <VerifyCodeForm />
        </Card>

        <div className="mt-4 text-center">
          <Link href="/verificar/recuperar" className="text-sm font-semibold text-primary-fg">
            ¿Olvidaste tu código?
          </Link>
        </div>
      </div>
    </div>
  );
}
