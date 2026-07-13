import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  icon?: IconName;
  sub?: string;
  tone?: "primary" | "neutral" | "danger" | "warning";
  className?: string;
}

const tones = {
  primary: "icon-badge bg-gradient-brand",
  neutral: "text-ink bg-black/5",
  danger: "icon-badge bg-gradient-danger",
  warning: "icon-badge bg-gradient-warning",
};

export function StatTile({
  label,
  value,
  icon,
  sub,
  tone = "primary",
  className,
}: StatTileProps) {
  return (
    <div className={cn("glass rounded-[var(--radius-glass-sm)] p-3.5 sm:p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted leading-tight">{label}</p>
        {icon && (
          <span
            className={cn(
              "grid place-items-center size-8 rounded-full shrink-0",
              tones[tone],
            )}
          >
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xl sm:text-2xl font-extrabold tracking-tight text-ink tabular">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
