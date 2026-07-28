"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
  children?: React.ReactNode;
}

// `secondary` antes era card-raised + hover:bg-white/85 — un blanco fijo que
// en modo oscuro aclaraba el botón en vez de oscurecerlo. Ahora las tres
// variantes no primarias se apoyan en superficies del sistema, así que
// responden al modo. Solo la primaria lleva gradiente: es la regla de
// jerarquía (una acción con peso por pantalla).
const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-brand text-white shadow-card hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface-raised text-ink border border-line-strong hover:bg-surface-sunken active:bg-surface-sunken",
  danger: "bg-gradient-danger text-white hover:brightness-110 active:brightness-95",
  ghost: "text-ink hover:bg-surface-sunken active:bg-surface-sunken",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-3 text-sm gap-1.5",
  md: "min-h-11 px-4 text-[1.05rem] gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  full,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "inline-flex items-center justify-center rounded-pill font-semibold",
        "transition-[filter,background-color] duration-150 cursor-pointer select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        full && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="size-4 rounded-pill border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </motion.button>
  );
}
