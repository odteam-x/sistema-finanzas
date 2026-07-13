import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  tone?: "primary" | "warning" | "danger";
  label?: string;
}

const tones = {
  primary: "bg-primary",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function ProgressBar({
  value,
  className,
  tone = "primary",
  label,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-2.5 w-full rounded-full bg-black/8 overflow-hidden", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
