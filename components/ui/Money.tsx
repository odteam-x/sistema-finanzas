import { formatDOP } from "@/lib/format";
import { cn } from "@/lib/cn";

interface MoneyProps {
  value: number;
  decimals?: boolean;
  className?: string;
}

/** Monto RD$ estático (sin animación) — contraparte de MoneyValue para
 *  listas y tablas, donde tabular-nums debe venir del componente y no de
 *  una clase que cada pantalla puede olvidar aplicar. */
export function Money({ value, decimals = true, className }: MoneyProps) {
  return <span className={cn("tabular", className)}>{formatDOP(value, decimals)}</span>;
}
