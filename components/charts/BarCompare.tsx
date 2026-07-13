import { formatDOP } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface Bar {
  name: string;
  value: number;
  tone?: "primary" | "accent" | "warning" | "danger" | "muted";
}

const toneBg: Record<NonNullable<Bar["tone"]>, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-black/25",
};

/** Barras horizontales para comparar montos (ej. ingreso vs presupuesto). */
export function BarCompare({ bars }: { bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="flex flex-col gap-3">
      {bars.map((b, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-ink">{b.name}</span>
            <span className="text-sm font-semibold text-ink tabular">
              {formatDOP(b.value, false)}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-black/8 overflow-hidden">
            <div
              className={cn("h-full rounded-full", toneBg[b.tone ?? "primary"])}
              style={{ width: `${(b.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
