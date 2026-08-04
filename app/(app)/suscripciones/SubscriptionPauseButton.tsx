"use client";

import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { toggleSubscriptionActive } from "./actions";

/** Pausar una suscripción no es lo mismo que eliminarla: cuando cancelas un
 *  servicio un par de meses quieres que deje de generarte el gasto automático
 *  sin perder el registro ni el historial de cobros que ya produjo.
 *
 *  Al reanudar, la acción adelanta `next_charge_date` al futuro para que el
 *  catch-up no genere los cobros del tiempo en que estuvo pausada — ver el
 *  comentario largo en toggleSubscriptionActive. */
export function SubscriptionPauseButton({
  id,
  active,
  name,
}: {
  id: string;
  active: boolean;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={active ? `Pausar ${name}` : `Reanudar ${name}`}
      title={active ? "Pausar" : "Reanudar"}
      onClick={() =>
        startTransition(async () => {
          const res = await toggleSubscriptionActive(id, !active);
          toast.show(
            res.ok
              ? active
                ? "Suscripción pausada"
                : "Reanudada — el próximo cobro se recalculó hacia adelante"
              : (res.error ?? "No se pudo cambiar el estado."),
          );
        })
      }
      className="grid place-items-center size-11 shrink-0 rounded-pill text-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
    >
      <Icon name={active ? "pause" : "play"} size={18} />
    </button>
  );
}
