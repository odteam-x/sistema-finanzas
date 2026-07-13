import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="glass rounded-[var(--radius-glass)] p-8 text-center flex flex-col items-center gap-3">
      <span className="grid place-items-center size-14 rounded-full bg-primary-soft text-primary">
        <Icon name={icon} size={28} />
      </span>
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="text-sm text-muted mt-1 max-w-xs mx-auto">{message}</p>
      </div>
      {action}
    </div>
  );
}
