"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

interface Message {
  role: "user" | "model";
  text: string;
  /** true = no es una respuesta del asistente, es la explicación de por qué
   *  no pudo responder — se pinta como aviso, no como mensaje de chat. */
  failed?: boolean;
}

/** Burbuja flotante de chat con el asistente (Gemini, ver
 *  app/api/assistant/route.ts). Cuando la llamada falla, la respuesta llega
 *  con `failed: true` y se pinta como aviso ámbar con el motivo concreto
 *  (clave inválida, modelo retirado, cuota…) en vez de un mensaje de chat
 *  normal — el usuario tiene que poder distinguir "el asistente te está
 *  contestando" de "el asistente está roto y esto es por qué". */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const rm = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const history = messages.slice(-10);
    const next: Message[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      const reply = typeof data.reply === "string" ? data.reply : "No pude responder justo ahora.";
      setMessages((prev) => [...prev, { role: "model", text: reply, failed: data.failed === true }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "No pude conectar. Revisa tu conexión e intenta de nuevo.", failed: true },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-[70] grid place-items-center">
        {/* Anillo pulsante — la señal de "esto es IA". Antes esa señal era un
         *  gradiente violeta→teal, el único color fuera de la paleta en toda
         *  la app. La lleva ahora el movimiento (el pulso) más el ícono de
         *  destello, que no exigen romper el sistema de color. */}
        {!open && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-pill bg-gradient-brand"
            animate={rm ? undefined : { scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
          className="relative grid place-items-center size-14 rounded-pill bg-gradient-brand text-white shadow-fab cursor-pointer active:scale-95 transition-transform"
        >
          <Icon name={open ? "close" : "sparkle"} size={24} weight={open ? "bold" : "fill"} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-[9.5rem] right-4 left-4 sm:left-auto lg:bottom-24 lg:right-6 z-[70] sm:w-96 max-w-full surface-sheet rounded-hero shadow-raised flex flex-col overflow-hidden"
            style={{ height: "min(28rem, 60vh)" }}
            initial={rm ? undefined : { opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="px-4 py-3 border-b border-line flex items-center gap-2">
              <span className="grid place-items-center size-7 rounded-pill bg-gradient-brand text-white shrink-0">
                <Icon name="sparkle" size={14} weight="fill" />
              </span>
              <p className="font-bold text-ink text-sm">Asistente de Cachin&apos;</p>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {messages.length === 0 && (
                <p className="text-sm text-muted">
                  Pregúntame sobre tu disponible, presupuesto, deudas o metas.
                </p>
              )}
              {messages.map((m, i) =>
                m.failed ? (
                  <div
                    key={i}
                    role="alert"
                    className="self-start max-w-[92%] rounded-tile bg-tint-warning px-3 py-2 text-sm text-ink flex items-start gap-2"
                  >
                    <Icon name="alert" size={17} className="text-warning shrink-0 mt-0.5" />
                    <span>{m.text}</span>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-tile px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "self-end bg-primary text-white"
                        : "self-start bg-surface-sunken text-ink"
                    }`}
                  >
                    {m.text}
                  </div>
                ),
              )}
              {sending && (
                <div className="self-start rounded-tile px-3 py-2 text-sm bg-surface-sunken text-muted">
                  Pensando…
                </div>
              )}
            </div>

            <div className="p-3 border-t border-line flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Escribe tu pregunta…"
                className="flex-1 min-h-10 rounded-pill bg-[var(--input-bg)] border border-[var(--input-border)] px-3.5 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-primary"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="Enviar"
                className="grid place-items-center size-10 rounded-pill bg-primary text-white disabled:opacity-40 cursor-pointer shrink-0"
              >
                <Icon name="arrowUpRight" size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
