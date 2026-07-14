"use client";

// Inspirado en reactbits.dev (MIT): número que cuenta hasta su valor al
// entrar en viewport. Renderiza el valor inicial en SSR y cliente por igual
// para no romper la hidratación; anima después de montar.
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function CountUp({
  to,
  from = 0,
  duration = 1.1,
  format = (n) => String(Math.round(n)),
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const rm = useReducedMotion();
  const fmt = useRef(format);

  const [display, setDisplay] = useState(() => format(from));
  const started = useRef(false);

  useEffect(() => {
    fmt.current = format;
  });

  useEffect(() => {
    if (started.current) return;
    if (rm) {
      setDisplay(fmt.current(to));
      started.current = true;
      return;
    }
    if (!inView) return;
    started.current = true;
    const controls = animate(from, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(fmt.current(v)),
    });
    return () => controls.stop();
  }, [inView, rm, to, from, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
