// Service worker: cache-first SOLO para /_next/static (nombres con hash de
// contenido — un deploy nuevo cambia el nombre del archivo, así que servir
// desde caché ahí nunca sirve contenido viejo). Todo lo demás que antes
// pasaba por cache-first (manifest.json, /icons/*.png, favicon…) usa
// rutas SIN hash: si cambian de contenido pero no de URL, cache-first las
// deja atascadas para siempre — es lo que causó que el ícono y el nombre
// de instalación de la PWA quedaran obsoletos tras un rebrand. Esas ahora
// son red-primero con la caché solo como respaldo offline.
//
// Offline de solo lectura: las navegaciones exitosas también se cachean
// (antes solo se usaba caches.match como fallback, pero nunca se llenaba).
// Así, una pantalla ya visitada con conexión queda disponible sin conexión
// con los últimos datos vistos — de solo lectura: los Server Actions
// (crear/editar) igual fallan sin red, eso no cambia acá.
const CACHE = "cachin-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no cachear Supabase ni externos

  // Navegaciones: red primero (siempre datos frescos con conexión), y se
  // guarda una copia en caché para que esa misma pantalla sirva sin
  // conexión más adelante. Sin red, se sirve la última copia cacheada de
  // ESA ruta, o el dashboard como último recurso.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/dashboard"))),
    );
    return;
  }

  // _next/static: nombre con hash de contenido — cache-first es seguro y
  // rápido, un contenido distinto siempre tiene una URL distinta.
  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Estáticos SIN hash (manifest.json, /icons/*, favicon…): red primero,
  // caché solo como respaldo offline — así un cambio de contenido en la
  // misma URL se ve de inmediato en la próxima visita con conexión.
  if (
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|png|svg|woff2?|ico|json)$/.test(url.pathname)
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
  }
});

// Push real (Bloque 12): el servidor firma y despacha el payload con la
// clave VAPID privada (lib/webpush.ts) — acá solo se recibe y se pinta. Con
// la app cerrada, esto es lo único que puede avisar (las notificaciones
// locales de NotificationTrigger.tsx solo disparan con la app abierta).
self.addEventListener("push", (event) => {
  let data = { title: "Cachin'", body: "Tienes una novedad.", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload no-JSON (no debería pasar, lib/webpush.ts siempre manda JSON) —
    // se usa el genérico de arriba en vez de fallar el evento entero.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.length > 0 && "focus" in clients[0]) {
        clients[0].navigate(url);
        return clients[0].focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
