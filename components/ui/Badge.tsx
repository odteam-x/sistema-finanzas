import { cn } from "@/lib/cn";

type Tone = "primary" | "neutral" | "danger" | "warning" | "success" | "info";

const tones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-fg",
  neutral: "bg-surface-sunken text-muted",
  danger: "bg-tint-expense text-danger",
  warning: "bg-tint-warning text-warning",
  // Bloque 4: caía en bg-primary-soft/text-primary-fg (teal) — el semántico
  // verde ya existe (ProgressBar/StatTile lo usan bien), Badge no lo leía.
  success: "bg-tint-income text-success",
  info: "bg-tint-info text-info",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
