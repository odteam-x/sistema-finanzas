import { MoneyValue } from "./MoneyValue";
import { Money } from "./Money";
import { Icon } from "./Icon";
import { ConfirmSalaryButton } from "./ConfirmSalaryButton";
import type { Salary } from "@/lib/types";

interface AvailableHeroProps {
  disponible: number;
  daysLeft: number;
  perDay: number;
  /** Ingreso auto-generado de esta quincena sin confirmar — mientras
   *  exista, se muestra un aviso a confirmar en vez de la cifra. */
  pendingSalary?: Salary | null;
}

/** Hero único del Inicio: reemplaza el toggle estimado/real de antes por
 *  un solo número honesto (balance real de la quincena) más la pregunta que
 *  el usuario realmente se hace día a día — "¿cuánto puedo gastar hoy?". */
export function AvailableHero({ disponible, daysLeft, perDay, pendingSalary }: AvailableHeroProps) {
  const negative = disponible < 0;

  if (pendingSalary) {
    return (
      <div className="bg-gradient-brand rounded-[var(--radius-glass)] p-4 sm:p-5 mb-4 overflow-hidden shadow-lg shadow-black/10">
        <p className="text-sm font-medium text-white/80 flex items-center gap-1.5">
          <Icon name="clock" size={15} />
          Pendiente de confirmar
        </p>
        <p className="text-lg sm:text-xl font-extrabold text-white mt-1 leading-snug">
          ¿Ya te llegó tu pago de <Money value={Number(pendingSalary.amount)} decimals={false} />?
        </p>
        <p className="text-sm text-white/70 mt-1">
          No lo sumamos a tu disponible hasta que lo confirmes.
        </p>
        <div className="mt-3">
          <ConfirmSalaryButton salaryId={pendingSalary.id} full />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-brand rounded-[var(--radius-glass)] p-4 sm:p-5 mb-4 overflow-hidden shadow-lg shadow-black/10">
      <p className="text-sm font-medium text-white/80">Disponible esta quincena</p>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <MoneyValue value={disponible} className="block text-money-lg font-extrabold text-white" />
        {negative && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 text-white text-xs font-semibold px-2 py-0.5">
            <Icon name="alert" size={12} />
            Negativo
          </span>
        )}
      </div>
      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-white/15">
        <div>
          <p className="text-xs text-white/70">Días restantes</p>
          <p className="font-bold text-white">{daysLeft}</p>
        </div>
        <div>
          <p className="text-xs text-white/70">Por día</p>
          <p className="font-bold text-white">
            <Money value={perDay} decimals={false} />
          </p>
        </div>
      </div>
    </div>
  );
}
