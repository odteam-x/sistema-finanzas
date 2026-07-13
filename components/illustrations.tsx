"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface IllProps {
  size?: number;
  className?: string;
}

/** Evita mismatch de hidratación: las animaciones inician tras montar. */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Alcancía con una moneda que cae (animación suave, idle). */
export function PiggyBank({ size = 120, className }: IllProps) {
  const rm = useReducedMotion();
  const mounted = useMounted();
  const animate = mounted && !rm;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Alcancía"
    >
      {/* Moneda que cae */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={animate ? { y: [-8, 26], opacity: [0, 1, 1, 0] } : { opacity: 0 }}
        transition={
          animate
            ? {
                duration: 2.2,
                repeat: Infinity,
                repeatDelay: 1.6,
                times: [0, 0.35, 0.7, 1],
                ease: "easeIn",
              }
            : undefined
        }
      >
        <circle cx="60" cy="22" r="7.5" fill="#E0B15C" stroke="#C79A45" strokeWidth="1.5" />
        <text x="60" y="25.5" textAnchor="middle" fontSize="9" fill="#8a6a1f" fontWeight="800">
          $
        </text>
      </motion.g>

      {/* Cuerpo (bob suave) */}
      <motion.g
        animate={animate ? { y: [0, -2.5, 0] } : undefined}
        transition={animate ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <ellipse cx="60" cy="72" rx="41" ry="31" fill="#3FA576" />
        <ellipse cx="60" cy="72" rx="41" ry="31" fill="#2E7D5B" opacity="0.15" />
        <rect x="38" y="97" width="9" height="13" rx="3.5" fill="#256B4C" />
        <rect x="73" y="97" width="9" height="13" rx="3.5" fill="#256B4C" />
        <path d="M40 47 l9 -13 l6 17 z" fill="#256B4C" />
        <ellipse cx="94" cy="75" rx="12" ry="10" fill="#7BC4A0" />
        <circle cx="90.5" cy="75" r="2" fill="#1F5540" />
        <circle cx="97" cy="75" r="2" fill="#1F5540" />
        <circle cx="73" cy="63" r="3.2" fill="#1E2A23" />
        <rect x="51" y="47" width="18" height="4.5" rx="2.25" fill="#1F5540" />
      </motion.g>
    </svg>
  );
}

/** Pila de monedas que aparecen una a una. */
export function CoinStack({ size = 120, className }: IllProps) {
  const rm = useReducedMotion();
  const mounted = useMounted();
  const animate = mounted && !rm;
  const coins = [92, 80, 68, 56];

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Monedas ahorradas"
    >
      {coins.map((y, i) => (
        <motion.g
          key={i}
          initial={false}
          animate={animate ? { opacity: [0, 1], y: [-10, 0] } : undefined}
          transition={
            animate
              ? { delay: i * 0.1, type: "spring", stiffness: 220, damping: 18 }
              : undefined
          }
        >
          <ellipse cx="60" cy={y + 8} rx="30" ry="10" fill="#C79A45" />
          <ellipse cx="60" cy={y + 5} rx="30" ry="10" fill="#E0B15C" stroke="#C79A45" strokeWidth="1.5" />
        </motion.g>
      ))}
      <text x="60" y="49" textAnchor="middle" fontSize="16" fill="#8a6a1f" fontWeight="800">
        $
      </text>
    </svg>
  );
}

/** Billetes (para estados vacíos de dinero). */
export function MoneyBills({ size = 120, className }: IllProps) {
  const rm = useReducedMotion();
  const mounted = useMounted();
  const animate = mounted && !rm;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Billetes"
    >
      <motion.g
        animate={animate ? { rotate: [-2, 2, -2] } : undefined}
        transition={animate ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined}
        style={{ transformOrigin: "60px 60px" }}
      >
        <rect x="24" y="52" width="72" height="42" rx="8" fill="#7BC4A0" transform="rotate(-8 60 73)" />
        <rect x="24" y="46" width="72" height="42" rx="8" fill="#3FA576" transform="rotate(-2 60 67)" />
        <rect x="24" y="40" width="72" height="42" rx="8" fill="#2E7D5B" />
        <circle cx="60" cy="61" r="12" fill="#E2EFE8" />
        <text x="60" y="66" textAnchor="middle" fontSize="14" fill="#2E7D5B" fontWeight="800">
          $
        </text>
      </motion.g>
    </svg>
  );
}
