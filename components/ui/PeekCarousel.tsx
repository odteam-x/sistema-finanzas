import { Children } from "react";

/** Carrusel horizontal con scroll-snap nativo (sin JS de arrastre): cada
 *  tarjeta ocupa ~78% del ancho, dejando ver un "peek" de la siguiente.
 *  En desktop (lg:) se despliega como una fila que envuelve normalmente. */
export function PeekCarousel({ children }: { children: React.ReactNode }) {
  return (
    <ul
      className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-2 mb-6
                 lg:flex-wrap lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {Children.map(children, (child) => (
        <li className="snap-start shrink-0 w-[78%] sm:w-[320px] lg:w-auto lg:flex-1 lg:min-w-[280px]">
          {child}
        </li>
      ))}
    </ul>
  );
}
