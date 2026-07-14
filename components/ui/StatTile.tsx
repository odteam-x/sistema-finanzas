import { cn } from "@/lib/cn";
import type { IconName } from "./Icon";
import { IconBubble } from "./IconBubble";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  icon?: IconName;
  sub?: string;
  tone?: "primary" | "neutral" | "danger" | "warning" | "info";
  className?: string;
}

// Delegado a IconBubble para que el círculo de ícono sea idéntico en toda
// la app (antes StatTile tenía su propio mapa de tonos, distinto al de
// las listas que ya usaban IconBubble).
const toneToBubble = {
  primary: "brand",
  neutral: "neutral",
  danger: "danger",
  warning: "warning",
  info: "info",
} as const;

// Danger/warning/info tiñen también el FONDO de la tarjeta (no solo el
// ícono) — le da variedad de color al tablero y refuerza la urgencia sin
// depender solo del color del ícono.
const toneBg = {
  primary: "glass",
  neutral: "glass",
  danger: "bg-danger-soft border border-black/5",
  warning: "bg-warning-soft border border-black/5",
  info: "bg-info-soft border border-black/5",
} as const;

export function StatTile({
  label,
  value,
  icon,
  sub,
  tone = "primary",
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        toneBg[tone],
        "rounded-[var(--radius-glass-sm)] p-3.5 sm:p-4 min-w-0 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs font-medium text-muted leading-tight">{label}</p>
        {icon && <IconBubble icon={icon} tone={toneToBubble[tone]} size="sm" />}
      </div>
      <p className="mt-1.5 text-money-sm font-extrabold tracking-tight text-ink tabular">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
