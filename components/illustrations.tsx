"use client";

import { useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface IllProps {
  size?: number;
  className?: string;
}

function subscribeNoop() {
  return () => {};
}

/** Evita mismatch de hidratación: las animaciones inician tras montar.
 *  useSyncExternalStore con snapshot de servidor `false` y de cliente
 *  `true` evita el patrón setState-dentro-de-effect (un solo render extra
 *  tras hidratar, sin doble commit). */
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/** Alcancía con una moneda que cae (animación suave, idle). Colores de
 *  marca vía variables de tema, para que cambien con "Personalizar". */
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
        <ellipse cx="60" cy="72" rx="41" ry="31" fill="var(--color-accent)" />
        <ellipse cx="60" cy="72" rx="41" ry="31" fill="var(--color-primary)" opacity="0.15" />
        <rect x="38" y="97" width="9" height="13" rx="3.5" fill="var(--color-primary-active)" />
        <rect x="73" y="97" width="9" height="13" rx="3.5" fill="var(--color-primary-active)" />
        <path d="M40 47 l9 -13 l6 17 z" fill="var(--color-primary-active)" />
        <ellipse
          cx="94"
          cy="75"
          rx="12"
          ry="10"
          fill="color-mix(in srgb, var(--color-accent) 70%, white)"
        />
        <circle cx="90.5" cy="75" r="2" fill="var(--color-primary-active)" />
        <circle cx="97" cy="75" r="2" fill="var(--color-primary-active)" />
        <circle cx="73" cy="63" r="3.2" fill="var(--color-ink)" />
        <rect x="51" y="47" width="18" height="4.5" rx="2.25" fill="var(--color-primary-active)" />
      </motion.g>
    </svg>
  );
}

/** Pila de monedas que aparecen una a una. Oro fijo (las monedas no cambian
 *  de color con el tema — el dorado es intencional, no marca). */
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

/** Billetes (para estados vacíos de dinero). Colores de marca vía variables. */
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
        <rect
          x="24"
          y="52"
          width="72"
          height="42"
          rx="8"
          fill="color-mix(in srgb, var(--color-accent) 70%, white)"
          transform="rotate(-8 60 73)"
        />
        <rect
          x="24"
          y="46"
          width="72"
          height="42"
          rx="8"
          fill="var(--color-accent)"
          transform="rotate(-2 60 67)"
        />
        <rect x="24" y="40" width="72" height="42" rx="8" fill="var(--color-primary)" />
        <circle cx="60" cy="61" r="12" fill="var(--color-primary-soft)" />
        <text x="60" y="66" textAnchor="middle" fontSize="14" fill="var(--color-primary)" fontWeight="800">
          $
        </text>
      </motion.g>
    </svg>
  );
}

/** Bandera de meta ondeando — para el estado vacío de Metas. */
export function GoalFlag({ size = 120, className }: IllProps) {
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
      aria-label="Meta"
    >
      {/* Base / sombra */}
      <ellipse cx="60" cy="103" rx="26" ry="6" fill="var(--color-ink)" opacity="0.08" />
      {/* Asta */}
      <rect x="42" y="20" width="5" height="83" rx="2.5" fill="var(--color-primary-active)" />
      <circle cx="44.5" cy="18" r="4" fill="var(--color-primary-active)" />
      {/* Bandera ondeando */}
      <motion.path
        d="M47 24 C 68 20, 78 30, 90 26 C 80 34, 80 44, 90 50 C 78 46, 68 56, 47 52 Z"
        fill="var(--color-accent)"
        animate={animate ? { d: [
          "M47 24 C 68 20, 78 30, 90 26 C 80 34, 80 44, 90 50 C 78 46, 68 56, 47 52 Z",
          "M47 24 C 66 22, 80 26, 90 24 C 82 32, 82 42, 90 48 C 80 44, 66 54, 47 52 Z",
          "M47 24 C 68 20, 78 30, 90 26 C 80 34, 80 44, 90 50 C 78 46, 68 56, 47 52 Z",
        ] } : undefined}
        transition={animate ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      <circle cx="66" cy="37" r="8" fill="var(--color-primary-soft)" />
      <path
        d="M62 37 l3 3.5 l6 -7.5"
        stroke="var(--color-primary)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Recibo con check — para el estado vacío de Deudas (nada pendiente). */
export function ReceiptCheck({ size = 120, className }: IllProps) {
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
      aria-label="Sin deudas pendientes"
    >
      <motion.g
        animate={animate ? { y: [0, -2, 0] } : undefined}
        transition={animate ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        {/* Recibo con borde zigzag abajo */}
        <path
          d="M34 18h52v66l-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6.5 5Z"
          fill="color-mix(in srgb, var(--color-cream) 40%, white 60%)"
          stroke="var(--color-primary-soft)"
          strokeWidth="2"
        />
        <rect x="43" y="30" width="34" height="4" rx="2" fill="var(--color-primary-soft)" />
        <rect x="43" y="40" width="26" height="4" rx="2" fill="var(--color-primary-soft)" />
        <rect x="43" y="50" width="30" height="4" rx="2" fill="var(--color-primary-soft)" />
        <rect x="43" y="60" width="20" height="4" rx="2" fill="var(--color-primary-soft)" />
      </motion.g>

      {/* Sello de check */}
      <motion.g
        initial={{ scale: 0.6, opacity: 0 }}
        animate={animate ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={animate ? { type: "spring", stiffness: 260, damping: 16, delay: 0.2 } : undefined}
        style={{ transformOrigin: "86px 82px" }}
      >
        <circle cx="86" cy="82" r="18" fill="var(--color-primary)" />
        <path
          d="M78 82 l6 6 l12 -13"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.g>
    </svg>
  );
}
