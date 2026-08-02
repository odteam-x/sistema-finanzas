import { NextResponse, type NextRequest } from "next/server";
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

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=enlace-invalido`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Los enlaces vencen y son de un solo uso: es el caso normal de "lo abrí
    // dos veces", no un fallo del sistema.
    return NextResponse.redirect(`${origin}/login?error=enlace-vencido`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
