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
  { icon: "piggy", label: "Ahorro", href: "/ahorros" },
  { icon: "goal", label: "Metas", href: "/metas" },
];

/** Fila de accesos rápidos con scroll horizontal nativo (sin librería). */
export function QuickActions({ actions = DEFAULT_ACTIONS }: { actions?: QuickAction[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex flex-col items-center gap-1.5 shrink-0 snap-start w-16 active:scale-95 transition-transform"
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
