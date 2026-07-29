import { cn } from "@/lib/cn";
import type { IconName } from "./Icon";
import { IconBubble } from "./IconBubble";

type Tone = "primary" | "neutral" | "danger" | "warning" | "info" | "income" | "expense";

/** Peso de la cifra dentro de la pantalla. Solo UN elemento por pantalla
 *  puede ser "hero": es la regla de jerarquía del rediseño. "quiet" existe
 *  para las rejillas de 4 tiles que antes competían con el saldo del hero. */
type Emphasis = "hero" | "normal" | "quiet";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  icon?: IconName;
  sub?: string;
  tone?: Tone;
  emphasis?: Emphasis;
  className?: string;
  /** 0-100. Cuando se pasa, dibuja una barra fina bajo la cifra — para
   *  cuando el número tiene un techo real que darle contexto (ej. cuánto es
   *  del total combinado). Opcional a propósito: no todos los tiles tienen
   *  un techo honesto que mostrar. */
  progress?: number;
}

// Mismo color que ya usa el texto/ícono del tile, pero como relleno sólido
// de barra. bg-line-strong para "neutral": ahí no hay una cifra de dinero
// que colorear, así que la barra tampoco debe insinuar una.
const toneBar: Record<Tone, string> = {
  primary: "bg-primary",
  neutral: "bg-line-strong",
  danger: "bg-expense",
  warning: "bg-warning",
  info: "bg-info",
  income: "bg-income",
  expense: "bg-expense",
};

const toneToBubble = {
  primary: "brand",
  neutral: "neutral",
  danger: "danger",
  warning: "warning",
  info: "info",
  income: "income",
  expense: "expense",
} as const;

// El tinte del FONDO acompaña al del ícono. Todos sólidos: sobre una
// superficie oscura un tinte con alpha dependía de qué hubiera detrás.
const toneBg: Record<Tone, string> = {
  primary: "bg-surface border border-line",
  neutral: "bg-surface border border-line",
  danger: "bg-tint-expense border border-line",
  warning: "bg-tint-warning border border-line",
  info: "bg-tint-info border border-line",
  income: "bg-tint-income border border-line",
  expense: "bg-tint-expense border border-line",
};

// El color de la cifra solo se aparta del gris cuando el tile ES el dato
// (ingreso/gasto del período). En los demás, teñir el número le quitaría
// peso al que sí domina la pantalla.
const toneValue: Record<Tone, string> = {
  primary: "text-ink",
  neutral: "text-ink",
  danger: "text-ink",
  warning: "text-ink",
  info: "text-ink",
  income: "text-income",
  expense: "text-expense",
};

// Los tres escalones tienen que ser monótonos EN TODO ancho de pantalla.
// Mezclar un tamaño fluido con uno fijo no lo garantiza: `text-xl` (23px
// fijo) salía más grande que `money-sm` (17.5px a 375px de ancho), o sea
// que "quiet" pesaba más que "normal" justo en móvil. Los tres son fluidos
// ahora, del mismo sistema, así que el orden se mantiene a cualquier ancho.
const emphasisValue: Record<Emphasis, string> = {
  hero: "money-lg",
  normal: "money-md",
  quiet: "money-sm",
};

const emphasisPad: Record<Emphasis, string> = {
  hero: "p-5 sm:p-6",
  normal: "p-4",
  quiet: "p-3.5",
};

export function StatTile({
  label,
  value,
  icon,
  sub,
  tone = "primary",
  emphasis = "normal",
  className,
  progress,
}: StatTileProps) {
  return (
    <div
      className={cn(
        toneBg[tone],
        emphasisPad[emphasis],
        "rounded-tile min-w-0 overflow-hidden shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* text-on-tint, no text-muted: la mitad de los tonos de este
            componente pintan un fondo teñido, y muted no llega a 4.5:1
            sobre ellos (ver la nota del token en globals.css). */}
        <p className="min-w-0 flex-1 text-xs font-medium text-on-tint leading-tight">{label}</p>
        {icon && (
          <IconBubble icon={icon} tone={toneToBubble[tone]} size={emphasis === "hero" ? "md" : "sm"} />
        )}
      </div>
      {/* mt-1.5 (no más): el valor pertenece a su label — se agrupan por
          proximidad, y el aire va ENTRE tiles, no dentro. */}
      <p
        className={cn(
          "mt-1.5 font-extrabold tracking-tight tabular",
          emphasisValue[emphasis],
          toneValue[tone],
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-on-tint">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-2 h-1 w-full rounded-pill bg-surface-sunken overflow-hidden">
          <div
            className={cn("h-full rounded-pill", toneBar[tone])}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
