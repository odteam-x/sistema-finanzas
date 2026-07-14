import Link from "next/link";
import { formatDOP, clampPct } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";
import { Illustration } from "./Illustration";
import type { Goal } from "@/lib/types";

const TIPS = [
  "Aparta tu ahorro apenas te paguen, no con lo que sobre al final del mes.",
  "Revisa tus gastos por categoría cada quincena — los pequeños se acumulan rápido.",
  "Un fondo de emergencia de 3 meses de gastos te protege de imprevistos.",
  "Antes de una compra grande, espera 24 horas: si sigues queriéndola, adelante.",
  "Registrar cada gasto, aunque sea pequeño, es lo que hace útil el presupuesto.",
  "Paga primero tus deudas con mayor interés — te ahorra más a largo plazo.",
];

function dailyTip(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return TIPS[dayOfYear % TIPS.length];
}

/** Tarjeta motivacional del Resumen: progreso de la meta principal si
 *  existe, o un tip financiero rotativo (por día) si no hay metas todavía. */
export function MotivationCard({ topGoal }: { topGoal: Goal | null }) {
  if (topGoal) {
    const pct = clampPct(Number(topGoal.current_amount), Number(topGoal.target_amount));
    return (
      <Link href="/metas" className="block mb-4">
        <div className="glass rounded-[var(--radius-glass)] p-4 sm:p-5 flex items-center gap-4">
          <Illustration name="target" width={84} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">Tu meta principal</p>
            <p className="font-bold text-ink truncate">{topGoal.name}</p>
            <div className="mt-2">
              <ProgressBar value={pct} />
              <p className="text-xs text-muted mt-1 tabular">
                {formatDOP(Number(topGoal.current_amount), false)} de{" "}
                {formatDOP(Number(topGoal.target_amount), false)} · {Math.round(pct)}%
              </p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="glass rounded-[var(--radius-glass)] p-4 sm:p-5 mb-4 flex items-center gap-4">
      <Illustration name="finance" width={84} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">Consejo del día</p>
        <p className="text-sm text-ink mt-1">{dailyTip()}</p>
      </div>
    </div>
  );
}
