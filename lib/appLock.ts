// Preferencias del BLOQUEO POR INACTIVIDAD en este dispositivo.
//
// Acá ya no vive ningún secreto. El código personal se guarda cifrado en el
// servidor (migration-v30) y se verifica allí; antes había un PIN hasheado en
// localStorage, que era un segundo secreto que recordar y que se comparaba en
// el cliente, o sea esquivable desde las herramientas del navegador.
//
// Lo que queda es lo que SÍ es del aparato: cada cuánto volver a pedir el
// código, cuándo se fue a segundo plano, y si este dispositivo tiene una
// credencial biométrica registrada. La verificación biométrica sigue sin
// llamar al servidor — que el navegador entregue una aserción de WebAuthn ya
// implica que el sensor verificó a la persona presente.
const SETTINGS_KEY = "cachin:lock";
const LAST_BACKGROUND_KEY = "cachin:lock-last-background";

export interface LockSettings {
  timeoutMinutes: number;
  webauthnCredentialId: string | null;
}

const DEFAULT_SETTINGS: LockSettings = {
  timeoutMinutes: 5,
  webauthnCredentialId: null,
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage no disponible (privado/lleno); el bloqueo simplemente no
    // persiste entre sesiones, no rompe el resto de la app.
  }
}

// ---- Store externo (para useSyncExternalStore, no useEffect+setState) ----
// getLockSettings() debe devolver SIEMPRE la misma referencia mientras nada
// haya cambiado — si creara un objeto nuevo en cada llamada, React lo vería
// como "cambiado" en cada render y re-renderizaría en bucle. Se cachea en
// memoria y solo se reemplaza la referencia dentro de saveLockSettings().
let cachedSettings: LockSettings | null = null;
type Listener = () => void;
const listeners = new Set<Listener>();

export function getLockSettings(): LockSettings {
  if (cachedSettings === null) {
    cachedSettings = { ...DEFAULT_SETTINGS, ...readStorage(SETTINGS_KEY, DEFAULT_SETTINGS) };
  }
  return cachedSettings;
}

/** Snapshot para SSR (sin localStorage) — misma referencia siempre, DEFAULT_SETTINGS
 *  nunca se muta directamente en este archivo. */
export function getLockSettingsServerSnapshot(): LockSettings {
  return DEFAULT_SETTINGS;
}

/** Se llama tras cada mutación para que los componentes suscritos (vía
 *  useSyncExternalStore) vuelvan a leer el estado — mismo patrón que
 *  cualquier store externo mínimo. */
export function subscribeToLockSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function saveLockSettings(patch: Partial<LockSettings>): void {
  cachedSettings = { ...getLockSettings(), ...patch };
  writeStorage(SETTINGS_KEY, cachedSettings);
  for (const l of listeners) l();
}

export function getTimeoutMinutes(): number {
  return getLockSettings().timeoutMinutes;
}

export function setTimeoutMinutes(minutes: number): void {
  saveLockSettings({ timeoutMinutes: minutes });
}

// ---- Actividad: cuándo se fue a segundo plano, para decidir si re-bloquear ----

export function markBackgroundedNow(): void {
  writeStorage(LAST_BACKGROUND_KEY, Date.now());
}

/** true si pasó más tiempo del configurado desde que la app se fue a
 *  segundo plano — 0 minutos ("Inmediato") siempre re-bloquea. */
export function hasExceededTimeout(): boolean {
  const minutes = getTimeoutMinutes();
  if (minutes <= 0) return true;
  const last = readStorage<number | null>(LAST_BACKGROUND_KEY, null);
  if (last == null) return false;
  return Date.now() - last >= minutes * 60_000;
}

// ---- Biometría (WebAuthn, autenticador de plataforma) ----

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasBiometricRegistered(): boolean {
  return getLockSettings().webauthnCredentialId !== null;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBuf(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}

/** Crea una credencial local con el autenticador de plataforma del
 *  dispositivo — nada de esto se manda a ningún servidor; el id de la
 *  credencial se guarda en localStorage para poder pedir la misma aserción de
 *  vuelta al desbloquear. Se habla de "dato biométrico" y no de la marca de
 *  cada sistema: el texto no debe cambiar según el aparato. */
export async function registerBiometric(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "Cachin'" },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "cachin-local",
          displayName: "Cachin'",
        },
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!credential) return false;
    saveLockSettings({ webauthnCredentialId: bufToBase64Url(credential.rawId) });
    return true;
  } catch {
    return false;
  }
}

export function clearBiometric(): void {
  saveLockSettings({ webauthnCredentialId: null });
}

/** Pide la aserción de vuelta — que el navegador la entregue sin lanzar
 *  error ya es la prueba (el sensor del dispositivo la exigió). No hay
 *  verificación de firma server-side: este bloqueo es local, no un login. */
export async function verifyBiometric(): Promise<boolean> {
  const s = getLockSettings();
  if (!s.webauthnCredentialId || typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: "public-key", id: base64UrlToBuf(s.webauthnCredentialId) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return assertion != null;
  } catch {
    return false;
  }
}
