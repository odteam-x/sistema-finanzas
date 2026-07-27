import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static, _next/image
     * - favicon, manifest, service worker, iconos e imágenes
     * - api/: los Route Handlers manejan su propia autenticación y
     *   devuelven códigos HTTP (401/403), no un redirect a /login — eso
     *   rompería por ejemplo el cron de Vercel (app/api/cron/daily-alerts),
     *   que llama sin cookie de sesión y necesita ver el 401 real, no un
     *   HTML de /login con status 200 detrás de un redirect.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
