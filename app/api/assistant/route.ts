// Route Handler (no Server Action) porque el widget de chat necesita poder
// llamarse desde un componente cliente con fetch normal, sin recargar la
// página ni pasar por el ciclo de revalidatePath de una Server Action.
import { getUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/data";
import { getFinanceSummary } from "@/lib/summary";
import { chatWithAssistant, isGeminiConfigured, type ChatTurn } from "@/lib/ai/gemini";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;

export async function POST(request: Request) {
  // getUser() en vez de requireUser(): ese último hace redirect(), que no
  // tiene sentido en un Route Handler — acá el 401 lo maneja el cliente.
  const user = await getUser();
  if (!user) return Response.json({ error: "No autenticado." }, { status: 401 });

  if (!isGeminiConfigured) {
    return Response.json({
      reply:
        "El asistente todavía no está configurado. Para activarlo, agrega tu GEMINI_API_KEY " +
        "gratis (aistudio.google.com/apikey) en las variables de entorno del proyecto.",
    });
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  if (!message) return Response.json({ error: "Escribe un mensaje." }, { status: 400 });

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history: ChatTurn[] = rawHistory
    .filter(
      (h): h is ChatTurn =>
        typeof h === "object" &&
        h !== null &&
        (h as ChatTurn).role !== undefined &&
        ((h as ChatTurn).role === "user" || (h as ChatTurn).role === "model") &&
        typeof (h as ChatTurn).text === "string",
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((h) => ({ role: h.role, text: h.text.slice(0, MAX_MESSAGE_LENGTH) }));

  const [summary, profile] = await Promise.all([getFinanceSummary(), getUserProfile()]);
  const reply = await chatWithAssistant(message, summary, history, profile?.display_name ?? undefined);

  if (reply == null) {
    return Response.json({
      reply: "No pude responder justo ahora. Intenta de nuevo en un momento.",
    });
  }
  return Response.json({ reply });
}
