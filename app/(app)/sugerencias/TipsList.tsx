"use client";

import { useSyncExternalStore } from "react";
import { AccordionItem } from "@/components/ui/Accordion";
import { orderTips, type TipSituation } from "@/lib/tips";
import { markTipSeen, readSeenTips, serverSeenTips, subscribeSeenTips } from "@/lib/seenTips";

/** Los consejos, ordenados por lo que le falta a esta persona y con los ya
 *  leídos al final.
 *
 *  La situación llega ya resuelta desde el servidor (depende de la base); lo
 *  único que vive en cliente es qué consejos abrió este dispositivo, que está
 *  en localStorage. Se lee con useSyncExternalStore y no con useState para que
 *  el snapshot del servidor sea "nada leído": así el HTML del servidor y el
 *  primer render del cliente coinciden, y el reordenamiento ocurre después de
 *  hidratar en vez de provocar un desajuste.
 *
 *  Marcar como leído NO recoloca la lista bajo el dedo: `subscribeSeenTips` es
 *  un no-op deliberado, así que el consejo baja la próxima vez que se entra a
 *  la pantalla. Reordenar en el momento movería justo lo que el usuario acaba
 *  de abrir. */
export function TipsList({ situation }: { situation: TipSituation }) {
  const seen = useSyncExternalStore(subscribeSeenTips, readSeenTips, serverSeenTips);
  const tips = orderTips(situation, seen);

  return (
    <div className="flex flex-col gap-2">
      {tips.map((t) => (
        <AccordionItem key={t.key} title={t.title} onOpen={() => markTipSeen(t.key)}>
          {t.body}
        </AccordionItem>
      ))}
    </div>
  );
}
