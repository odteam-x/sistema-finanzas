import { cn } from "@/lib/cn";
import { ILLUSTRATION_RATIOS, type IllustrationName } from "./illustrations.generated";

export type { IllustrationName };

interface IllustrationProps {
  name: IllustrationName;
  /** Ancho máximo en px. El alto sale de la proporción real del SVG. */
  width?: number;
  /** Tope de alto. Existe por `wallet`, que es casi el doble de alto que de
   *  ancho (ratio 0.45): a 148px de ancho ocupaba 327px de alto y convertía
   *  un estado vacío en un bloque de pantalla completa. */
  maxHeight?: number;
  className?: string;
}

/** Ilustraciones de unDraw (licencia libre, sin atribución), en
 *  /public/illustrations. Cada una tiene su variante `.dark.svg` generada por
 *  scripts/build-illustrations-dark.mjs.
 *
 *  Va como `background-image` y no como <img> a propósito: se cargan como
 *  imagen, así que las variables CSS de la página no las alcanzan y el color
 *  tiene que venir horneado en el archivo. Con dos <img> (uno por tema) el
 *  navegador descargaría los dos aunque uno esté oculto; con background-image
 *  el CSS elige la URL y solo baja la que se ve. Son decorativas
 *  (`aria-hidden`): el texto del estado vacío ya dice todo lo que hace falta. */
export function Illustration({
  name,
  width = 180,
  maxHeight = 168,
  className,
}: IllustrationProps) {
  const ratio = ILLUSTRATION_RATIOS[name];
  // Se elige el lado que mande para que NUNCA se pase del tope de alto.
  const finalWidth = Math.min(width, maxHeight * ratio);

  return (
    <span
      aria-hidden="true"
      className={cn("illustration block select-none", className)}
      style={{
        width: finalWidth,
        aspectRatio: String(ratio),
        ["--illu" as string]: `url(/illustrations/${name}.svg)`,
        ["--illu-dark" as string]: `url(/illustrations/${name}.dark.svg)`,
      }}
    />
  );
}
