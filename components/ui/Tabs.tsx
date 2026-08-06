"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

/** Píldoras, no pestañas de escritorio. `glass` se cae: esa clase ya no existe
 *  en globals.css —el sistema pasó a superficies sólidas— así que llevaba
 *  tiempo sin hacer nada, y este era su último uso en toda la app. */
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "card inline-flex gap-1 rounded-pill p-1",
        // Medido a escala de texto 1.3 en Calculadora: las tres píldoras
        // ("Mi cobro / Meta de ahorro / Préstamo") llegan a 358px y desbordan
        // los 375 de un teléfono, empujando la PÁGINA ENTERA a desplazarse en
        // horizontal. Un scroll lateral en toda la pantalla se siente roto,
        // porque desalinea todo lo demás con el borde.
        //
        // Aquí lo correcto no es encoger el texto —quien puso la escala grande
        // la necesita— sino que el desbordamiento se quede DENTRO de su propia
        // fila: la tira se desliza sola y el resto de la pantalla no se entera.
        // Misma solución que ya usa PeekCarousel, con la barra oculta.
        "max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        // min-h-11: con py-2 sobre texto de 16px quedaba en 40px, por debajo
        // del mínimo táctil de 44.
        "rounded-pill min-h-11 px-4 text-sm font-semibold text-muted cursor-pointer",
        "transition-colors hover:text-ink active:scale-[0.97]",
        // text-on-brand y no text-white: es el token que ya define qué va
        // encima del relleno de marca, y responde al modo.
        "data-[state=active]:bg-primary data-[state=active]:text-on-brand",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 focus:outline-none", className)} {...props} />;
}
