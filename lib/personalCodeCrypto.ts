// Cifrado del código personal y firma de la cookie de verificación.
//
// Web Crypto y no node:crypto a propósito: esto lo usa TAMBIÉN el proxy
// (lib/supabase/middleware.ts), que corre en el runtime Edge, donde
// node:crypto no existe. `crypto.subtle` está disponible en Edge y en Node 18+,
// así que el mismo módulo sirve en los dos lados.
//
// Sin "server-only": el proxy lo importa desde el Edge y ese marcador lo
// rechazaría. Igual nunca llega al bundle del navegador — solo lo importan el
// middleware y Server Actions, y sin PERSONAL_CODE_SECRET no hace nada.
import { isValidPersonalCode } from "./personalCode";

const ENC = new TextEncoder();
const DEC = new TextDecoder();

/** Sin secreto configurado, el código personal simplemente no está
 *  disponible: la app funciona igual, solo que sin segundo factor. Se prefiere
 *  eso a arrancar con una llave por defecto, que daría una falsa sensación de
 *  cifrado y sería la misma en todas las instalaciones. */
export function isPersonalCodeConfigured(): boolean {
  return Boolean(process.env.PERSONAL_CODE_SECRET);
}

function secret(): string {
  const s = process.env.PERSONAL_CODE_SECRET;
  if (!s) throw new Error("Falta PERSONAL_CODE_SECRET");
  return s;
}

/** Deriva una llave AES de 256 bits del secreto. Se usa SHA-256 del secreto
 *  como material: el secreto ya es una cadena aleatoria larga generada con
 *  `openssl rand -hex 32`, no una contraseña humana, así que no hace falta un
 *  KDF lento — lo que un KDF compra (resistir fuerza bruta sobre una
 *  contraseña débil) acá no aplica. */
async function aesKey(): Promise<CryptoKey> {
  const material = await crypto.subtle.digest("SHA-256", ENC.encode(secret()));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function hmacKey(): Promise<CryptoKey> {
  // Contexto distinto al del cifrado para que las dos llaves no sean la misma
  // aunque salgan del mismo secreto.
  const material = await crypto.subtle.digest("SHA-256", ENC.encode(`cookie:${secret()}`));
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Se construye con `new Uint8Array(len)` y no con `Uint8Array.from(...)`
// porque el segundo se infiere como Uint8Array<ArrayBufferLike>, que desde
// TypeScript 5.7 ya no encaja en `BufferSource` (podría estar respaldado por
// un SharedArrayBuffer). Web Crypto exige un ArrayBuffer de verdad.
function fromB64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---- Cifrado del código -----------------------------------------------------

/** AES-256-GCM. El IV va por delante del texto cifrado: es aleatorio por
 *  cifrado (nunca se reutiliza con la misma llave, que es lo único que GCM no
 *  perdona) y no es secreto. GCM además autentica, así que un valor manipulado
 *  en la base falla al descifrar en vez de devolver basura. */
export async function encryptPersonalCode(code: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await aesKey(),
    ENC.encode(code),
  );
  const out = new Uint8Array(iv.length + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), iv.length);
  return toB64Url(out);
}

/** Devuelve null si el valor no descifra (llave cambiada, fila manipulada) en
 *  vez de lanzar: quien llama decide si eso es "código incorrecto" o "no hay
 *  código", y en ningún caso conviene reventar la petición entera. */
export async function decryptPersonalCode(payload: string): Promise<string | null> {
  try {
    const raw = fromB64Url(payload);
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(), data);
    const code = DEC.decode(plain);
    return isValidPersonalCode(code) ? code : null;
  } catch {
    return null;
  }
}

// ---- Cookie de verificación -------------------------------------------------

/** Nombre de la cookie que dice que este navegador ya pasó el código.
 *  No guarda el código: solo a quién pertenece y hasta cuándo vale. */
export const CODE_COOKIE = "cachin_code";

/** Cuánto vale la verificación. Ocho horas: cubre un día de uso sin volver a
 *  pedirlo, y expira sola si el dispositivo queda por ahí. Es cookie de
 *  sesión además, así que cerrar el navegador también la tira. */
export const CODE_COOKIE_MAX_AGE = 8 * 60 * 60;

/** El estado que la cookie certifica.
 *  'ok'  → el usuario tecleó su código y era correcto.
 *  'off' → este usuario no tiene código activo. Se emite igual para no
 *          repetir la consulta a la base en cada navegación: el proxy corre
 *          en TODAS y no puede permitirse un viaje de red (ver la nota de
 *          rendimiento en lib/supabase/middleware.ts). */
export type CodeCookieState = "ok" | "off";

/** Firma `estado.userId.expira` con HMAC-SHA256. Ata la cookie al usuario: la
 *  de una cuenta no sirve en otra ni aunque se copie el valor. */
export async function signCodeCookie(
  userId: string,
  state: CodeCookieState,
  nowMs: number = Date.now(),
): Promise<string> {
  const exp = Math.floor(nowMs / 1000) + CODE_COOKIE_MAX_AGE;
  const payload = `${state}.${userId}.${exp}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), ENC.encode(payload));
  return `${payload}.${toB64Url(new Uint8Array(sig))}`;
}

/** El estado que certifica la cookie, o null si falta, está manipulada,
 *  venció o es de otro usuario. */
export async function readCodeCookie(
  token: string | undefined,
  userId: string,
  nowMs: number = Date.now(),
): Promise<CodeCookieState | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [state, sub, expRaw, sig] = parts;
  if (state !== "ok" && state !== "off") return null;
  if (sub !== userId) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 <= nowMs) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromB64Url(sig),
      ENC.encode(`${state}.${sub}.${exp}`),
    );
    return valid ? state : null;
  } catch {
    return null;
  }
}
