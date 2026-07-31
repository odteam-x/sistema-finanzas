import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

interface IconBubbleProps {
  icon: IconName;
  size?: "sm" | "md" | "lg";
  /** brand: relleno de marca con ícono blanco (elementos protagonistas).
   *  income/expense: dirección del dinero. warning/info: tipo de compromiso.
   *  neutral: gris plano — el tono por defecto de las listas largas, para
   *  que las filas no compitan con las cifras. */
  tone?: "brand" | "income" | "expense" | "danger" | "warning" | "info" | "neutral";
  className?: string;
}

const sizes = {
  sm: { wrap: "size-9", icon: 18 },
  md: { wrap: "size-11", icon: 22 },
  lg: { wrap: "size-14", icon: 28 },
};

// Todos los tintes son sólidos. El único con relleno saturado es `brand`:
// es el que marca "esto es lo principal de la fila".
const tones = {
  brand: "bg-gradient-brand text-white",
  income: "bg-tint-income text-income",
  expense: "bg-tint-expense text-expense",
  danger: "bg-tint-danger text-danger",
  warning: "bg-tint-warning text-warning",
  info: "bg-tint-info text-info",
  neutral: "bg-tint-neutral text-muted",
};

/** Círculo de ícono consistente en toda la app — antes cada página lo armaba
 *  a mano con clases distintas (gradiente en unas, plano en otras). */
export function IconBubble({ icon, size = "md", tone = "neutral", className }: IconBubbleProps) {
  const s = sizes[size];
  return (
    <span
      className={cn("grid place-items-center rounded-pill shrink-0", s.wrap, tones[tone], className)}
    >
      <Icon name={icon} size={s.icon} />
    </span>
  );
}
