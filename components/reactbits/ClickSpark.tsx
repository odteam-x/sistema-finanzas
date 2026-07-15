"use client";

// Inspirado en reactbits.dev (MIT): chispa sutil en el punto donde el usuario
// toca/clickea. Overlay a pantalla completa (una sola instancia), sin capturar
// eventos. Respeta prefers-reduced-motion.
import { useEffect, useRef } from "react";

interface Spark {
  x: number;
  y: number;
  start: number;
}

interface ClickSparkProps {
  /** Color de la chispa. Si no se da, se resuelve en vivo desde
   *  --color-primary (sigue el tema claro/oscuro sin hex fijo). */
  color?: string;
  count?: number;
  size?: number;
  radius?: number;
  duration?: number;
}

export function ClickSpark({
  color,
  count = 8,
  size = 11,
  radius = 18,
  duration = 420,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    // Canvas 2D no resuelve var(--x) — hay que leer el color computado. Se
    // relee en cada trazo (barato) para que siga el tema claro/oscuro en vivo.
    const resolveColor = () =>
      color ||
      getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() ||
      "#127478";

    const draw = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparks.current = sparks.current.filter((s) => now - s.start < duration);
      const strokeColor = resolveColor();
      for (const s of sparks.current) {
        const t = ease((now - s.start) / duration);
        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (let i = 0; i < count; i++) {
          const angle = (2 * Math.PI * i) / count;
          const dist = radius * t;
          const x1 = s.x + Math.cos(angle) * dist;
          const y1 = s.y + Math.sin(angle) * dist;
          const x2 = s.x + Math.cos(angle) * (dist + size * (1 - t));
          const y2 = s.y + Math.sin(angle) * (dist + size * (1 - t));
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf.current = sparks.current.length
        ? requestAnimationFrame(draw)
        : (raf.current = null);
    };

    const onDown = (e: PointerEvent) => {
      sparks.current.push({ x: e.clientX, y: e.clientY, start: performance.now() });
      if (raf.current == null) raf.current = requestAnimationFrame(draw);
    };
    window.addEventListener("pointerdown", onDown);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [color, count, size, radius, duration]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[200]"
    />
  );
}
