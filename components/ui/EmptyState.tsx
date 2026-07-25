import { Icon, type IconName } from "./Icon";
import { Illustration, type IllustrationName } from "./Illustration";

interface EmptyStateProps {
  icon: IconName;
  /** Máximo ~4 palabras. */
  title: string;
  /** Una línea de contexto. */
  message: string;
  /** Botón primario que resuelve el vacío — obligatorio: un estado vacío
   *  sin acción es un callejón sin salida para el usuario. */
  action: React.ReactNode;
  /** Reemplaza el círculo de ícono por una ilustración más grande — solo
   *  para el vacío PRIMARIO de una pantalla (ej. "Sin deudas registradas").
   *  Los vacíos secundarios ("Sin resultados" de un filtro) se quedan con
   *  el ícono chico: son transitorios, no ameritan tanto peso visual. */
  illustration?: IllustrationName;
}

export function EmptyState({ icon, title, message, action, illustration }: EmptyStateProps) {
  return (
    <div className="glass rounded-[var(--radius-glass)] p-6 text-center flex flex-col items-center gap-2.5">
      {illustration ? (
        <Illustration name={illustration} width={148} className="mb-1" />
      ) : (
        <span className="grid place-items-center size-12 rounded-full bg-primary-soft text-primary">
          <Icon name={icon} size={24} />
        </span>
      )}
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="text-sm text-muted mt-0.5">{message}</p>
      </div>
      <div className="mt-1">{action}</div>
    </div>
  );
}
