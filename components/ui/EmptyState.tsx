import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  icon: IconName;
  /** Máximo ~4 palabras. */
  title: string;
  /** Una línea de contexto. */
  message: string;
  /** Botón primario que resuelve el vacío — obligatorio: un estado vacío
   *  sin acción es un callejón sin salida para el usuario. */
  action: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="glass rounded-[var(--radius-glass)] p-6 text-center flex flex-col items-center gap-2.5">
      <span className="grid place-items-center size-12 rounded-full bg-primary-soft text-primary">
        <Icon name={icon} size={24} />
      </span>
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="text-sm text-muted mt-0.5">{message}</p>
      </div>
      <div className="mt-1">{action}</div>
    </div>
  );
}
