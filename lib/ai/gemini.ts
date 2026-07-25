// Integración con Gemini (Google AI Studio) — PREPARADA, no activada aún.
// Para activarla: crea una API key gratis en https://aistudio.google.com/apikey
// y agrégala como GEMINI_API_KEY (en .env.local para local, y en Vercel para prod).
// Mientras no exista la key, `isGeminiConfigured` es false y la app la ignora.

import "server-only";
import type { FinanceSummary } from "@/lib/summary";
import { formatDOP } from "@/lib/format";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
// Historial de este campo: gemini-2.0-flash se retiró el 1 jun 2026 y rompió
// el asistente en silencio; se cambió a gemini-2.5-flash, que Google empezó a
// desactivar ANTES de su fecha anunciada (16 oct 2026) y volvió a romperlo.
//
// `gemini-flash-latest` en vez de una versión fija: es el alias que Google
// mueve al Flash estable vigente (hoy gemini-3.6-flash, lanzado el 21 jul
// 2026). Con el alias, el próximo retiro no vuelve a dejar el asistente
// muerto esperando que alguien edite esta línea — que es exactamente lo que
// pasó las dos veces anteriores.
const MODEL = "gemini-flash-latest";

export const isGeminiConfigured = GEMINI_API_KEY.length > 0;

/** Las claves de Google AI Studio son de la forma `AIza…` (39 caracteres).
 *  Se chequea el formato porque una clave de OTRO servicio de Google (un
 *  token OAuth, una clave de Firebase, etc.) pasa el `length > 0` de arriba
 *  y luego falla con 400 en cada llamada — el asistente parecía "activado"
 *  pero nunca respondía, sin decir por qué. */
export const looksLikeGeminiKey = /^AIza[\w-]{20,}$/.test(GEMINI_API_KEY);

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/** Por qué falló la llamada — el llamador traduce esto a un mensaje que le
 *  sirva al usuario. Antes cualquier falla devolvía `null` y la UI decía
 *  "no pude responder ahora", que no distingue entre "la clave está mal",
 *  "el modelo ya no existe" y "se acabó la cuota" — por eso este bug
 *  sobrevivió dos rondas sin diagnosticarse. */
export type GeminiFailure = "sin-clave" | "clave-invalida" | "modelo" | "cuota" | "red" | "vacio";

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; reason: GeminiFailure };

function buildContext(summary: FinanceSummary): string {
  return [
    `Ingreso quincenal: ${formatDOP(summary.ingresoQuincena)}`,
    `Presupuesto estimado de la quincena: ${formatDOP(summary.estQuincena)}`,
    `Gasto real registrado: ${formatDOP(summary.realQuincena)}`,
    `Cuotas de deuda del periodo: ${formatDOP(summary.cuotasPeriodo)}`,
    `Balance real (disponible): ${formatDOP(summary.saldoReal)}`,
    `Total adeudado: ${formatDOP(summary.outstandingDebt)}`,
    `Total ahorrado: ${formatDOP(summary.savingsTotal)}`,
    `Metas activas: ${summary.goals.length}`,
  ].join("\n");
}

async function callGemini(
  contents: { role: "user" | "model"; parts: { text: string }[] }[],
): Promise<GeminiResult> {
  if (!isGeminiConfigured) return { ok: false, reason: "sin-clave" };
  if (!looksLikeGeminiKey) {
    console.error("[gemini] GEMINI_API_KEY no tiene formato de clave de AI Studio (AIza…)");
    return { ok: false, reason: "clave-invalida" };
  }

  try {
    const res = await fetch(
      // La clave va en header, no en la query string: una URL con la clave
      // dentro termina en logs de proxies y de la propia plataforma.
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({ contents }),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const body = await res.text();
      // Log server-side (Vercel → proyecto → Logs). El cuerpo de Google
      // nunca incluye la clave, así que es seguro registrarlo entero.
      console.error(`[gemini] ${res.status} ${res.statusText}: ${body}`);
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { ok: false, reason: "clave-invalida" };
      }
      if (res.status === 404) return { ok: false, reason: "modelo" };
      if (res.status === 429) return { ok: false, reason: "cuota" };
      return { ok: false, reason: "red" };
    }

    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[gemini] respuesta sin texto:", JSON.stringify(data).slice(0, 500));
      return { ok: false, reason: "vacio" };
    }
    return { ok: true, text };
  } catch (err) {
    console.error("[gemini] fetch failed:", err);
    return { ok: false, reason: "red" };
  }
}

/** Mensaje para el usuario según la falla. Dice qué pasó Y qué hacer — no un
 *  código ni un "intenta más tarde" genérico. */
export function failureMessage(reason: GeminiFailure): string {
  switch (reason) {
    case "sin-clave":
      return (
        "El asistente todavía no está configurado. Crea una API key gratis en " +
        "aistudio.google.com/apikey y agrégala como GEMINI_API_KEY en las variables " +
        "de entorno del proyecto."
      );
    case "clave-invalida":
      return (
        "La API key de Gemini no es válida. Revisa que sea una key de Google AI Studio " +
        "(aistudio.google.com/apikey) — esas empiezan con “AIza”. Si la que guardaste " +
        "empieza con otra cosa, es de otro servicio de Google y no sirve acá."
      );
    case "modelo":
      return (
        "El modelo de IA configurado ya no existe. Google los retira cada cierto tiempo; " +
        "hay que actualizar el modelo en lib/ai/gemini.ts."
      );
    case "cuota":
      return "Se agotó la cuota de la API por ahora. Intenta de nuevo en unos minutos.";
    case "vacio":
      return "Gemini respondió vacío. Intenta reformular la pregunta.";
    case "red":
      return "No pude conectar con el servicio de IA. Revisa tu conexión e intenta de nuevo.";
  }
}

/**
 * Genera consejos financieros personalizados a partir del resumen del usuario.
 * Devuelve null si falla — acá sí se degrada en silencio a propósito: son
 * consejos decorativos dentro de una pantalla que ya tiene contenido propio,
 * no una respuesta que el usuario pidió explícitamente.
 */
export async function getFinanceAdvice(
  summary: FinanceSummary,
  displayName?: string,
): Promise<string | null> {
  const saludo = displayName?.trim()
    ? `El usuario se llama ${displayName.trim()}; dirígete a él/ella por su nombre de forma natural. `
    : "";

  const prompt =
    "Eres un asistente de finanzas personales en República Dominicana (moneda RD$). " +
    saludo +
    "Con base en estos datos del usuario, da 3 consejos breves, concretos y accionables " +
    "en español, con tono cercano. No des asesoría de inversión. Datos:\n\n" +
    buildContext(summary);

  const res = await callGemini([{ role: "user", parts: [{ text: prompt }] }]);
  return res.ok ? res.text : null;
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/**
 * Asistente conversacional del sitio: responde preguntas sobre las finanzas
 * del usuario con el resumen actual como contexto. Devuelve el resultado
 * completo (no null) para que el llamador pueda decirle al usuario QUÉ
 * falló — acá sí importa, porque el usuario hizo una pregunta explícita y
 * merece saber por qué no obtuvo respuesta.
 */
export async function chatWithAssistant(
  message: string,
  summary: FinanceSummary,
  history: ChatTurn[] = [],
  displayName?: string,
): Promise<GeminiResult> {
  const saludo = displayName?.trim() ? `El usuario se llama ${displayName.trim()}. ` : "";
  const systemPrompt =
    "Eres el asistente de Cachin', una app de finanzas personales en República Dominicana " +
    "(moneda RD$). " +
    saludo +
    "Responde en español, tono cercano y breve (unas pocas frases, no ensayos). " +
    "Usa los datos financieros de abajo para responder con precisión sobre la situación " +
    "del usuario. " +
    "LÍMITE ESTRICTO DE TEMA: solo respondes sobre las finanzas personales del usuario " +
    "(su disponible, presupuesto, deudas, ahorros, metas, gastos, ingresos) y educación " +
    "financiera general básica relacionada. No das asesoría de inversión, trading ni " +
    "criptomonedas. Si te preguntan algo fuera de finanzas personales (código, tareas, " +
    "noticias, opiniones sobre otros temas, etc.), responde brevemente que solo puedes " +
    "ayudar con las finanzas del usuario dentro de Cachin' y redirige la conversación ahí — " +
    "no respondas la pregunta fuera de tema aunque la sepas. " +
    "Datos actuales del usuario:\n\n" +
    buildContext(summary);

  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Entendido, aquí estoy para ayudarte con tus finanzas." }] },
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  return callGemini(contents);
}
