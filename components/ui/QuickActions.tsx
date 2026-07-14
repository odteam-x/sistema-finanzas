import Link from "next/link";
import { IconBubble } from "./IconBubble";
import type { IconName } from "./Icon";

interface QuickAction {
  icon: IconName;
  label: string;
  href: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { icon: "wallet", label: "Ingreso", href: "/ingresos" },
  { icon: "budget", label: "Gasto", href: "/presupuesto" },
  { icon: "piggy", label: "Ahorro", href: "/balance" },
  { icon: "goal", label: "Metas", href: "/metas" },
];

/** Tarjeta de accesos rápidos: 4 destinos agrupados en una sola superficie
 *  (antes: fila suelta con scroll horizontal innecesario para 4 ítems que
 *  ya caben sin desbordar). */
export function QuickActions({ actions = DEFAULT_ACTIONS }: { actions?: QuickAction[] }) {
  return (
    <div className="glass rounded-[var(--radius-glass)] p-3 mb-4 grid grid-cols-4 gap-1">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex flex-col items-center gap-1.5 py-1 rounded-2xl active:scale-95 active:bg-black/5 transition-transform"
        >
          <IconBubble icon={a.icon} tone="brand" size="md" />
          <span className="text-xs font-semibold text-ink/80 text-center leading-tight">
            {a.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
