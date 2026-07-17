"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

interface Message {
  role: "user" | "model";
  text: string;
}

/** Burbuja flotante de chat con el asistente (Gemini, ver
 *  app/api/assistant/route.ts) — funciona igual sin API key configurada,
 *  solo que la primera respuesta explica cómo activarlo (degradación
 *  consistente con getFinanceAdvice en lib/ai/gemini.ts). */
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
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "model", text: "No pude conectar. Intenta de nuevo." }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-[70] grid place-items-center size-14 rounded-full bg-gradient-brand text-white shadow-lg shadow-black/25 cursor-pointer active:scale-95 transition-transform"
      >
        <Icon name={open ? "close" : "bulb"} size={24} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-[9.5rem] right-4 left-4 sm:left-auto lg:bottom-24 lg:right-6 z-[70] sm:w-96 max-w-full sheet-surface rounded-[26px] shadow-lg shadow-black/25 flex flex-col overflow-hidden"
            style={{ height: "min(28rem, 60vh)" }}
            initial={rm ? undefined : { opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="px-4 py-3 border-b border-black/5 flex items-center gap-2">
              <Icon name="bulb" size={18} className="text-primary" />
              <p className="font-bold text-ink text-sm">Asistente de Cachin&apos;</p>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {messages.length === 0 && (
                <p className="text-sm text-muted">
                  Pregúntame sobre tu disponible, presupuesto, deudas o metas.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "self-end bg-primary text-white"
                      : "self-start bg-black/5 text-ink"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {sending && (
                <div className="self-start rounded-2xl px-3 py-2 text-sm bg-black/5 text-muted">
                  Pensando…
                </div>
              )}
            </div>

            <div className="p-3 border-t border-black/5 flex items-center gap-2">
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
                className="flex-1 min-h-10 rounded-full bg-[var(--input-bg)] border border-[var(--input-border)] px-3.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="Enviar"
                className="grid place-items-center size-10 rounded-full bg-primary text-white disabled:opacity-40 cursor-pointer shrink-0"
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
