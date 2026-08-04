import { Icon } from "./Icon";

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  /** Se dispara al ABRIR, no al cerrar. Opcional: sin él el componente sigue
   *  siendo puro marcado y puede renderizarse desde el servidor. Solo se pasa
   *  desde componentes cliente (ver sugerencias/TipsList.tsx). */
  onOpen?: () => void;
}

/** <details> nativo: colapsable, accesible por teclado/lector de pantalla
 *  sin JS extra. Se usa para contenido educativo genérico que no necesita
 *  estar siempre visible (a diferencia de las alertas, que sí importan). */
export function AccordionItem({ title, children, onOpen }: AccordionItemProps) {
  return (
    <details
      className="group card rounded-tile"
      onToggle={onOpen ? (e) => e.currentTarget.open && onOpen() : undefined}
    >
      <summary className="flex items-center justify-between gap-3 p-3.5 cursor-pointer list-none font-semibold text-sm text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <Icon
          name="chevronDown"
          size={16}
          className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="px-3.5 pb-3.5 text-sm text-muted">{children}</div>
    </details>
  );
}
