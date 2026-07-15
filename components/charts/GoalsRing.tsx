import { formatDOP, clampPct } from "@/lib/format";

interface GoalsRingProps {
  saved: number;
  target: number;
  size?: number;
}

/** Anillo de progreso total de ahorro (todas las metas juntas). A
 *  diferencia de BudgetRing, aquí más ahorrado siempre es bueno — un solo
 *  color, sin framing de "excedido". */
export function GoalsRing({ saved, target, size = 108 }: GoalsRingProps) {
  const pct = target > 0 ? clampPct(saved, target) : 0;

  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const len = (pct / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${Math.round(pct)}% de tus metas de ahorro`}
        className="shrink-0"
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
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
        <p className="text-xs font-medium text-muted">Ahorrado en tus metas</p>
        <p className="text-money-md font-extrabold text-primary tabular">{formatDOP(saved, false)}</p>
        <p className="text-xs text-muted mt-0.5 tabular">de {formatDOP(target, false)}</p>
      </div>
    </div>
  );
}
