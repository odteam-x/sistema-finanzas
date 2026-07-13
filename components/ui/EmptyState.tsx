import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  action?: React.ReactNode;
  /** Ilustración animada opcional (ver components/illustrations.tsx) — si se
   *  da, reemplaza el círculo de ícono por defecto. */
  illustration?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action, illustration }: EmptyStateProps) {
  return (
    <div className="glass rounded-[var(--radius-glass)] p-8 text-center flex flex-col items-center gap-3">
      {illustration ?? (
        <span className="grid place-items-center size-14 rounded-full bg-primary-soft text-primary">
          <Icon name={icon} size={28} />
        </span>
      )}
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="text-sm text-muted mt-1 max-w-xs mx-auto">{message}</p>
      </div>
      {action}
    </div>
  );
}
