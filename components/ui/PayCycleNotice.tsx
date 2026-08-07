import Link from "next/link";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { IconBubble } from "./IconBubble";

/**
 * Aviso de que las cifras de esta pantalla salen de un ciclo de cobro que el
 * usuario nunca eligió.
 *
 * `salary_settings` nace con los días 15 y 30. No es un error de la base, pero
 * sí una suposición: quien cobra los 5 y 20 ve sus quincenas, su presupuesto
 * por día y su estimado del mes calculados sobre días ajenos, y nada en la
 * pantalla lo dice. Los números se ven igual de firmes que si fueran suyos.
 *
 * Enseñar una cifra adivinada sin marcarla es peor que no enseñar nada: la
 * primera se usa para decidir.
 *
 * Se muestra solo mientras `confirmed_at` sea NULL. En cuanto el usuario guarda
 * su ciclo desaparece de las tres pantallas a la vez.
 */
export function PayCycleNotice() {
  return (
    <Card className="mb-4 flex items-start gap-3">
      {/* Ámbar, no rojo: no hay nada roto ni en peligro — hace falta un dato
          que solo el usuario tiene. Es el nivel intermedio de la Fase 26. */}
      <IconBubble icon="clock" tone="warning" size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          Estos números usan un ciclo de cobro de ejemplo
        </p>
        <p className="text-xs text-muted mt-0.5">
          Están calculados sobre los días 15 y 30, que es lo que trae la app por
          defecto. Dinos cuándo cobras de verdad y pasan a ser tuyos.
        </p>
        <Link
          href="/ingresos"
          className="touch-target inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-primary-fg"
        >
          <Icon name="wallet" size={16} />
          Configurar mi ciclo
        </Link>
      </div>
    </Card>
  );
}
