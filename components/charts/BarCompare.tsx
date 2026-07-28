import { formatDOP } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface Bar {
  name: string;
  value: number;
  tone?: "primary" | "accent" | "warning" | "danger" | "income" | "expense" | "muted";
}

const toneBg: Record<NonNullable<Bar["tone"]>, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-expense",
  income: "bg-income",
  expense: "bg-expense",
  muted: "bg-line-strong",
};

/** Barras horizontales para comparar montos (ej. ingreso vs presupuesto).
 *  El track usa la superficie hundida del sistema: antes era una alfa sobre
 *  negro, que sobre una tarjeta oscura desaparecía por completo. */
export function BarCompare({ bars }: { bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="flex flex-col gap-3.5">
      {bars.map((b, i) => (
        <div key={i}>
          {/* Label a la izquierda, número a la derecha: la lectura de una
              lista clave-valor va siempre así. */}
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-sm text-muted min-w-0 truncate">{b.name}</span>
            <span className="text-sm font-bold text-ink tabular shrink-0">
              {formatDOP(b.value, false)}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-pill bg-surface-sunken overflow-hidden">
            <div
              className={cn("h-full rounded-pill", toneBg[b.tone ?? "primary"])}
              style={{ width: `${(b.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
