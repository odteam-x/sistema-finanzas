import { MoneyValue } from "./MoneyValue";
import { Icon } from "./Icon";

interface BalanceHeroProps {
  balance: number;
}

/** Hero PRIMARIO del Inicio: cuánto dinero tienes de verdad ahora mismo,
 *  sumando todas tus cuentas (efectivo, banco, tarjetas, ahorros...) — el
 *  número más grande de la pantalla, antes que "Disponible esta quincena"
 *  (que es un cálculo del período, no el balance real). */
export function BalanceHero({ balance }: BalanceHeroProps) {
  return (
    <div className="bg-gradient-brand rounded-[var(--radius-glass)] p-5 sm:p-6 mb-3 overflow-hidden shadow-lg shadow-black/10">
      <p className="text-sm font-medium text-white/80 flex items-center gap-1.5">
        <Icon name="wallet" size={15} />
        Balance actual
      </p>
      <MoneyValue
        value={balance}
        decimals={false}
        className="block text-4xl sm:text-5xl font-extrabold text-white mt-1 tracking-tight"
      />
      <p className="text-xs text-white/70 mt-1">Suma de todas tus cuentas</p>
    </div>
  );
}
