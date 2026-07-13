"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDOP } from "@/lib/format";
import { MoneyValue } from "./MoneyValue";
import { Icon } from "./Icon";

interface BalanceHeroProps {
  saldoEstimado: number;
  saldoReal: number;
  ingresoQuincena: number;
  estQuincena: number;
  realQuincena: number;
  cuotasPeriodo: number;
}

/** Widget hero único que fusiona "Saldo estimado" y "Balance real" con
 *  pestañas internas. Fondo en degradado de marca (no glass/blanco como el
 *  resto) para que sea inequívocamente LA tarjeta protagonista de la
 *  pantalla — el resto de tarjetas se quedan claras/glass a propósito. */
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
  const negative = value < 0;

  return (
    <div className="bg-gradient-brand rounded-[var(--radius-glass)] p-4 sm:p-5 mb-4 overflow-hidden shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="inline-flex bg-black/15 rounded-full p-1 text-xs font-semibold">
          <button
            onClick={() => setTab("estimado")}
            aria-pressed={isEst}
            className={cn(
              "px-3 py-1.5 rounded-full transition-colors cursor-pointer",
              isEst ? "bg-white text-primary" : "text-white/80 hover:text-white",
            )}
          >
            Estimado
          </button>
          <button
            onClick={() => setTab("real")}
            aria-pressed={!isEst}
            className={cn(
              "px-3 py-1.5 rounded-full transition-colors cursor-pointer",
              !isEst ? "bg-white text-primary" : "text-white/80 hover:text-white",
            )}
          >
            Real
          </button>
        </div>
        <span className="grid place-items-center size-10 rounded-full bg-white/20 text-white shrink-0">
          <Icon name={isEst ? "wallet" : "trendUp"} size={20} />
        </span>
      </div>

      <p className="text-sm font-medium text-white/80">
        {isEst ? "Saldo disponible estimado" : "Balance real (sin presupuesto)"}
      </p>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <MoneyValue key={tab} value={value} className="block text-money-lg font-extrabold text-white" />
        {negative && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 text-white text-xs font-semibold px-2 py-0.5">
            <Icon name="alert" size={12} />
            Negativo
          </span>
        )}
      </div>
      <p className="text-xs text-white/70 mt-1">
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
