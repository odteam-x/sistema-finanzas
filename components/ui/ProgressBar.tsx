import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  /** `achievement` es el unico tono celebratorio y solo se usa en Ahorros
   *  (ver el token en globals.css). En Deudas esta prohibido. */
  tone?: "primary" | "warning" | "danger" | "achievement";
  label?: string;
}

const tones = {
  primary: "bg-primary",
  warning: "bg-warning",
  danger: "bg-danger",
  achievement: "bg-achievement",
};

export function ProgressBar({
  value,
  className,
  tone = "primary",
  label,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-2.5 w-full rounded-pill bg-surface-sunken overflow-hidden", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        /* La barra se LLENA, no salta: la transicion va en style y no en una
           clase para consumir los tokens de duracion y curva directamente. Los
           500ms que tenia quedaban fuera de las tres duraciones del sistema. */
        className={cn("h-full rounded-pill", tones[tone])}
        style={{
          width: `${pct}%`,
          transition: "width var(--dur-pantalla) var(--ease-entrada)",
        }}
      />
    </div>
  );
}
