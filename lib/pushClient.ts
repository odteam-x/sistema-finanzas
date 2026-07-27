// Suscripción push del lado del navegador (Bloque 12) — el envío real lo
// hace el servidor (lib/webpush.ts) con la clave VAPID privada; acá solo se
// registra el endpoint de ESTE navegador/dispositivo.
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
}

/** Se llama justo después de que Notification.requestPermission() resuelve
 *  "granted" (ver NotificationToggle.tsx) — pedir la suscripción sin permiso
 *  ya concedido solo lanzaría un error del navegador. */
export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
    }
    const json = subscription.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Si ya hay una suscripción activa de ESTE navegador — para no mostrar
 *  "reintentar" cuando en realidad ya está todo funcionando (ej. al volver
 *  a Configuración en una sesión donde el permiso ya se concedió antes). */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Silencioso: en el peor caso queda una suscripción huérfana en la base
    // que se limpia sola en el próximo envío fallido (ver lib/webpush.ts).
  }
}

/** iOS solo entrega push a una PWA agregada a la pantalla de inicio
 *  (Safari 16.4+) — mostrarlo ayuda a que el toggle no prometa algo que
 *  Safari no va a cumplir si el usuario todavía la tiene abierta en pestaña. */
export function isIosNotInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const standalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return isIos && !standalone;
}
