import { formatDOP, clampPct } from "@/lib/format";

interface BudgetRingProps {
  spent: number;
  budget: number;
  size?: number;
}

/** Anillo de progreso gastado-vs-presupuesto. Misma técnica SVG que
 *  DonutChart (stroke-dasharray), pero de un solo valor: no reemplaza la
 *  dona de distribución por categoría, es un vistazo rápido al total. */
export function BudgetRing({ spent, budget, size = 108 }: BudgetRingProps) {
  const over = budget > 0 && spent > budget;
  const pct = clampPct(spent, budget || 1);
  const remaining = budget - spent;

  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const len = (pct / 100) * circ;
  const color = over ? "var(--color-danger)" : "var(--color-primary)";

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${Math.round(pct)}% del presupuesto usado`}
        className="shrink-0"
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${len} ${circ - len}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x={cx} y={cy + 5} textAnchor="middle" className="fill-ink" style={{ fontSize: 17, fontWeight: 800 }}>
          {Math.round(pct)}%
        </text>
      </svg>

      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{over ? "Excedido" : "Restante"}</p>
        <p
          className="text-money-md font-extrabold tabular"
          style={{ color: over ? "var(--color-danger)" : "var(--color-primary)" }}
        >
          {formatDOP(Math.abs(remaining), false)}
        </p>
        <p className="text-xs text-muted mt-0.5 tabular">
          {formatDOP(spent, false)} de {formatDOP(budget, false)}
        </p>
      </div>
    </div>
  );
}
