"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDOP } from "@/lib/format";
import { MoneyValue } from "./MoneyValue";
import { IconBubble } from "./IconBubble";

interface BalanceHeroProps {
  saldoEstimado: number;
  saldoReal: number;
  ingresoQuincena: number;
  estQuincena: number;
  realQuincena: number;
  cuotasPeriodo: number;
}

/** Widget hero único que fusiona "Saldo estimado" y "Balance real" con
 *  pestañas internas — antes eran dos tarjetas del mismo peso visual,
 *  compitiendo por atención. El monto sigue siendo el elemento más grande. */
export function BalanceHero({
  saldoEstimado,
  saldoReal,
  ingresoQuincena,
  estQuincena,
  realQuincena,
  cuotasPeriodo,
}: BalanceHeroProps) {
  const [tab, setTab] = useState<"estimado" | "real">("estimado");
  const isEst = tab === "estimado";
  const value = isEst ? saldoEstimado : saldoReal;

  return (
    <div className="glass-strong rounded-[var(--radius-glass)] p-4 sm:p-5 mb-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="inline-flex glass rounded-full p-1 text-xs font-semibold">
          <button
            onClick={() => setTab("estimado")}
            aria-pressed={isEst}
            className={cn(
              "px-3 py-1.5 rounded-full transition-colors cursor-pointer",
              isEst ? "bg-primary text-white" : "text-muted hover:text-ink",
            )}
          >
            Estimado
          </button>
          <button
            onClick={() => setTab("real")}
            aria-pressed={!isEst}
            className={cn(
              "px-3 py-1.5 rounded-full transition-colors cursor-pointer",
              !isEst ? "bg-primary text-white" : "text-muted hover:text-ink",
            )}
          >
            Real
          </button>
        </div>
        <IconBubble icon={isEst ? "wallet" : "trendUp"} tone="brand" size="md" />
      </div>

      <p className="text-sm font-medium text-muted">
        {isEst ? "Saldo disponible estimado" : "Balance real (sin presupuesto)"}
      </p>
      <MoneyValue
        key={tab}
        value={value}
        className={cn(
          "block text-money-lg font-extrabold mt-1",
          value >= 0 ? "text-gradient-brand" : "text-danger",
        )}
      />
      <p className="text-xs text-muted mt-1">
        {isEst ? (
          <>
            Ingreso {formatDOP(ingresoQuincena, false)} − presupuesto{" "}
            {formatDOP(estQuincena, false)} − cuotas {formatDOP(cuotasPeriodo, false)}
          </>
        ) : (
          <>
            Ingreso {formatDOP(ingresoQuincena, false)} − gastado real{" "}
            {formatDOP(realQuincena, false)} − cuotas {formatDOP(cuotasPeriodo, false)}
          </>
        )}
      </p>
    </div>
  );
}
