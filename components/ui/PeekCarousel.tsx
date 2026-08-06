import { Children } from "react";

/** Cuántas tarjetas caben antes de que el carrusel valga la pena. Hasta aquí
 *  se apilan; a partir de aquí se deslizan.
 *
 *  El "peek" —ver un trozo de la siguiente— existe para decir "hay más".
 *  Con dos o tres tarjetas no hay nada que anunciar: lo único que se ve es una
 *  tarjeta cortada por la mitad, que se lee como un fallo de maquetación y no
 *  como una invitación a deslizar. Y encima obliga a deslizar para ver algo
 *  que cabía perfectamente apilado. */
const MIN_PARA_CARRUSEL = 4;

/** Lista de tarjetas que se adapta a cuántas hay.
 *
 *  · Hasta 3 → apiladas a ancho completo. Se ven todas de una vez.
 *  · 4 o más → carrusel horizontal con scroll-snap nativo (sin JS de
 *    arrastre): cada tarjeta ocupa ~78%, dejando ver un trozo de la siguiente.
 *
 *  En escritorio (lg:) siempre es una fila que envuelve: ahí sobra el ancho. */
export function PeekCarousel({ children }: { children: React.ReactNode }) {
  const total = Children.count(children);
  const apilar = total < MIN_PARA_CARRUSEL;

  return (
    <ul
      className={
        apilar
          ? "flex flex-col gap-3 mb-6 lg:flex-row lg:flex-wrap"
          : `flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-2 mb-6
             lg:flex-wrap lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0
             [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
      }
    >
      {Children.map(children, (child) => (
        <li
          className={
            apilar
              ? "w-full lg:w-auto lg:flex-1 lg:min-w-[280px]"
              : "snap-start shrink-0 w-[78%] sm:w-[320px] lg:w-auto lg:flex-1 lg:min-w-[280px]"
          }
        >
          {child}
        </li>
      ))}
    </ul>
  );
}
