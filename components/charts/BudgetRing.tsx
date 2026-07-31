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
  // Sin presupuesto configurado no hay contra qué comparar: es un tercer
  // estado, no un caso raro de los otros dos. Antes `over` llevaba un guard
  // `budget > 0` que lo forzaba a false, así que con presupuesto en RD$0 y
  // gasto real se caía en la rama "Te queda esta quincena" mostrando
  // Math.abs(0 - spent) — o sea, lo YA GASTADO disfrazado de saldo a favor,
  // y en verde. El anillo además marcaba 100% por el `budget || 1`, con lo
  // que el aria-label y el texto se contradecían.
  const unset = budget <= 0;
  const over = spent > budget;
  const pct = unset ? 0 : clampPct(spent, budget);
  const remaining = budget - spent;

  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const len = (pct / 100) * circ;
  // El trazo del anillo es forma, no texto: puede usar el color saturado.
  // La CIFRA de abajo no — ahí va el token legible sobre superficie.
  const ringColor = unset
    ? "var(--color-line-strong)"
    : over
      ? "var(--color-expense)"
      : "var(--color-primary)";

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          unset ? "Sin presupuesto configurado" : `${Math.round(pct)}% del presupuesto usado`
        }
        className="shrink-0"
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-surface-sunken)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={`${len} ${circ - len}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x={cx} y={cy + 5} textAnchor="middle" className="fill-ink" style={{ fontSize: 17, fontWeight: 800 }}>
          {unset ? "—" : `${Math.round(pct)}%`}
        </text>
      </svg>

      {/* Es la cifra dominante de la pantalla de Gastos: sube a `money-lg`
          para que nada más de esa pantalla compita con ella. */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted">
          {unset ? "Gastado esta quincena" : over ? "Excedido" : "Te queda esta quincena"}
        </p>
        <p
          className={`money-lg font-extrabold tabular ${
            unset ? "text-ink" : over ? "text-expense" : "text-primary-fg"
          }`}
        >
          {/* Sin presupuesto, la única cifra honesta es lo gastado: un
              "restante" sobre una base de RD$0 no significa nada. */}
          {formatDOP(unset ? spent : Math.abs(remaining), false)}
        </p>
        <p className="text-xs text-muted mt-1 tabular">
          {unset ? "Sin presupuesto configurado" : `${formatDOP(spent, false)} de ${formatDOP(budget, false)}`}
        </p>
      </div>
    </div>
  );
}
