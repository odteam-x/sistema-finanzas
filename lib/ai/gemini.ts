// Integración con Gemini (Google AI Studio) — PREPARADA, no activada aún.
// Para activarla: crea una API key gratis en https://aistudio.google.com/apikey
// y agrégala como GEMINI_API_KEY (en .env.local para local, y en Vercel para prod).
// Mientras no exista la key, `isGeminiConfigured` es false y la app la ignora.

import "server-only";
import type { FinanceSummary } from "@/lib/summary";
import { formatDOP } from "@/lib/format";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const MODEL = "gemini-2.0-flash";

export const isGeminiConfigured = GEMINI_API_KEY.length > 0;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/**
 * Genera consejos financieros personalizados a partir del resumen del usuario.
 * Devuelve null si no hay API key o si la llamada falla (la app degrada sin romperse).
 */
export async function getFinanceAdvice(
  summary: FinanceSummary,
  displayName?: string,
): Promise<string | null> {
  if (!isGeminiConfigured) return null;

  const saludo = displayName?.trim()
    ? `El usuario se llama ${displayName.trim()}; dirígete a él/ella por su nombre de forma natural. `
    : "";

  const contexto = [
    `Ingreso quincenal: ${formatDOP(summary.ingresoQuincena)}`,
    `Presupuesto estimado de la quincena: ${formatDOP(summary.estQuincena)}`,
    `Gasto real registrado: ${formatDOP(summary.realQuincena)}`,
    `Cuotas de deuda del periodo: ${formatDOP(summary.cuotasPeriodo)}`,
    `Balance real: ${formatDOP(summary.saldoReal)}`,
    `Total adeudado: ${formatDOP(summary.outstandingDebt)}`,
    `Total ahorrado: ${formatDOP(summary.savingsTotal)}`,
    `Metas activas: ${summary.goals.length}`,
  ].join("\n");

  const prompt =
    "Eres un asistente de finanzas personales en República Dominicana (moneda RD$). " +
    saludo +
    "Con base en estos datos del usuario, da 3 consejos breves, concretos y accionables " +
    "en español, con tono cercano. No des asesoría de inversión. Datos:\n\n" +
    contexto;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}
