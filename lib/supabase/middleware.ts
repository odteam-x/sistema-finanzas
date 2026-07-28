// Refresca la sesión de Supabase en cada request y protege las rutas.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";
import { withAuthTimeout } from "./authTimeout";

const PUBLIC_PATHS = ["/login", "/auth"];

// Ver lib/supabase/authTimeout.ts para la causa raíz completa: sin este
// límite, una sesión vencida con la red inestable puede colgar TODA
// navegación (este middleware corre en cada una) 20-28 segundos dentro del
// propio SDK de Supabase.
const AUTH_TIMEOUT_MS = 5000;

export async function updateSession(request: NextRequest) {
  // Sin Supabase configurado, dejamos pasar todo (la UI muestra el aviso de setup).
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANTE: no ejecutar código entre createServerClient y la verificación.
  //
  // getClaims() en vez de getUser(): verifica la FIRMA del JWT con la clave
  // pública del proyecto (ES256) en local, en lugar de preguntarle al servidor
  // de Auth en cada petición. Este middleware corre en TODA navegación, así
  // que ese viaje de 90-600ms se pagaba siempre antes de empezar a cargar
  // nada. Sigue refrescando la sesión y reescribiendo las cookies: getClaims()
  // pasa por getSession() por dentro, que es quien renueva el token vencido.
  // Ver la nota larga en lib/auth.ts y en authTimeout.ts.
  const result = await withAuthTimeout(supabase.auth.getClaims(), AUTH_TIMEOUT_MS);
  const user = result?.data?.claims?.sub ? { id: result.data.claims.sub } : null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
