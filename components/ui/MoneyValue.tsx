"use client";

import { CountUp } from "@/components/reactbits/CountUp";
import { formatDOP } from "@/lib/format";
import { cn } from "@/lib/cn";

interface MoneyValueProps {
  value: number;
  decimals?: boolean;
  duration?: number;
  className?: string;
}

/** Monto RD$ que anima (count-up) al entrar en pantalla. */
export function MoneyValue({
  value,
  decimals = true,
  duration,
  className,
}: MoneyValueProps) {
  return (
    <CountUp
      to={value}
      duration={duration}
      format={(n) => formatDOP(n, decimals)}
      className={cn("tabular tracking-tight", className)}
    />
  );
}
