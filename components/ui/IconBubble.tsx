import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

interface IconBubbleProps {
  icon: IconName;
  size?: "sm" | "md" | "lg";
  /** brand: degradado de marca (para elementos protagonistas: cuentas, accesos rápidos).
   *  neutral/danger: fondo plano (para listas largas — evita que compitan con las cifras). */
  tone?: "brand" | "danger" | "neutral";
  className?: string;
}

const sizes = {
  sm: { wrap: "size-9", icon: 18 },
  md: { wrap: "size-11", icon: 22 },
  lg: { wrap: "size-14", icon: 28 },
};

const tones = {
  brand: "icon-badge bg-gradient-brand",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-primary-soft text-primary",
};

/** Círculo de ícono consistente en toda la app — antes cada página lo
 *  armaba a mano con clases distintas (gradiente en unas, plano en otras). */
export function IconBubble({ icon, size = "md", tone = "neutral", className }: IconBubbleProps) {
  const s = sizes[size];
  return (
    <span
      className={cn("grid place-items-center rounded-full shrink-0", s.wrap, tones[tone], className)}
    >
      <Icon name={icon} size={s.icon} />
    </span>
  );
}
