// Refresca la sesión de Supabase en cada request y protege las rutas.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";
import { withAuthTimeout } from "./authTimeout";
import {
  CODE_COOKIE,
  CODE_COOKIE_MAX_AGE,
  isPersonalCodeConfigured,
  readCodeCookie,
  signCodeCookie,
} from "../personalCodeCrypto";

const PUBLIC_PATHS = ["/login", "/auth"];

/** Rutas que se ven CON sesión pero SIN haber pasado el código personal: la
 *  propia pantalla de verificación y su recuperación. Sin esto el gate se
 *  redirigiría a sí mismo en bucle. */
const CODE_EXEMPT_PATHS = ["/login", "/auth", "/verificar"];

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

  // ---- Segundo factor: código personal ------------------------------------
  //
  // El gate vive acá y no en una pantalla suelta después del login porque una
  // pantalla se esquiva escribiendo /dashboard en la barra de direcciones. Acá
  // no responde NINGUNA ruta de la app sin haber pasado el código.
  //
  // El coste está acotado: lo normal es que haya una cookie firmada válida, y
  // validarla es HMAC local, sin red — que es justo lo que exige la nota de
  // rendimiento de arriba. La consulta a la base solo ocurre cuando NO hay
  // cookie: una vez cada ocho horas por dispositivo, no en cada navegación.
  if (user && isPersonalCodeConfigured() && !CODE_EXEMPT_PATHS.some((p) => path.startsWith(p))) {
    const state = await readCodeCookie(request.cookies.get(CODE_COOKIE)?.value, user.id);
    if (!state) {
      const { data } = await supabase
        .from("user_profile")
        .select("personal_code_active")
        .maybeSingle();

      if (data?.personal_code_active) {
        const url = request.nextUrl.clone();
        url.pathname = "/verificar";
        url.search = "";
        return NextResponse.redirect(url);
      }

      // Sin código activo se emite la cookie igual, para no repetir esta
      // consulta en cada navegación de quien no usa la función.
      supabaseResponse.cookies.set(CODE_COOKIE, await signCodeCookie(user.id, "off"), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: CODE_COOKIE_MAX_AGE,
      });
    }
  }

  return supabaseResponse;
}
