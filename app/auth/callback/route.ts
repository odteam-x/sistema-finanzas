import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Destino de los enlaces que Supabase manda por correo (confirmar cuenta,
 *  recuperar contraseña). Canjea el código de un solo uso por una sesión y
 *  redirige.
 *
 *  Es un Route Handler y no una página porque canjear el código ESCRIBE las
 *  cookies de sesión, y eso no se puede hacer al renderizar un Server
 *  Component. `/auth` ya estaba en PUBLIC_PATHS del proxy desde antes, aunque
 *  no existiera ninguna ruta debajo. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Se acota a rutas internas: sin esto, un enlace con ?next=https://otro-sitio
  // convertiría este callback en un redirector abierto.
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  // Supabase manda los enlaces por correo en DOS formatos según cómo se hayan
  // generado, y hasta ahora aquí solo se entendía uno:
  //
  //  · PKCE          → ?code=...            (lo que emite el cliente del navegador)
  //  · OTP por correo → ?token_hash=&type=  (lo que emite la API de administración,
  //                                          y lo que trae una plantilla de correo
  //                                          con {{ .TokenHash }})
  //
  // Faltaba el segundo, así que un enlace mágico acuñado desde el servidor
  // aterrizaba aquí, no encontraba `code` y rebotaba al login. Los dos son de
  // un solo uso y caducan igual; el token_hash no sirve para nada sin este
  // canje, así que aceptarlo no abre ninguna puerta nueva.
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=enlace-invalido`);
  }

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        // `type` viene en el propio enlace (magiclink, recovery, email...). Se
        // cae a "email" si falta, que es el tipo de confirmación de cuenta.
        type: (otpType as EmailOtpType) ?? "email",
      });
  if (error) {
    // Los enlaces vencen y son de un solo uso: es el caso normal de "lo abrí
    // dos veces", no un fallo del sistema.
    return NextResponse.redirect(`${origin}/login?error=enlace-vencido`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
