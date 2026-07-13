import { formatDOP } from "@/lib/format";

export interface Slice {
  name: string;
  value: number;
}

// Paleta accesible (verdes + acentos), consistente con el tema.
const COLORS = [
  "#2e7d5b",
  "#3fa576",
  "#7bc4a0",
  "#b06f10",
  "#e0b15c",
  "#2b6cb0",
  "#9aa79f",
];

interface DonutChartProps {
  data: Slice[];
  centerLabel?: string;
}

/** Dona SVG sin dependencias. Agrupa el excedente en "Otros" (máx. 6 segmentos). */
export function DonutChart({ data, centerLabel = "Total" }: DonutChartProps) {
  const clean = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  // Agrupar más de 6 categorías en "Otros"
  let slices = clean;
  if (clean.length > 6) {
    const top = clean.slice(0, 5);
    const rest = clean.slice(5).reduce((s, d) => s + d.value, 0);
    slices = [...top, { name: "Otros", value: rest }];
  }

  const total = slices.reduce((s, d) => s + d.value, 0);
  const size = 180;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Distribución: ${slices
          .map((s) => `${s.name} ${Math.round((s.value / total) * 100)}%`)
          .join(", ")}`}
        className="shrink-0"
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
        {slices.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += len;
          return el;
        })}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-muted"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {centerLabel}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-ink"
          style={{ fontSize: 17, fontWeight: 800 }}
        >
          {formatDOP(total, false)}
        </text>
      </svg>

      <ul className="flex-1 w-full flex flex-col gap-1.5">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-ink flex-1 truncate">{s.name}</span>
            <span className="text-muted tabular">
              {Math.round((s.value / total) * 100)}%
            </span>
            <span className="text-ink font-semibold tabular w-24 text-right">
              {formatDOP(s.value, false)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
