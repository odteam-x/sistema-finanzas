import { Icon } from "./Icon";

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
}

/** <details> nativo: colapsable, accesible por teclado/lector de pantalla
 *  sin JS extra. Se usa para contenido educativo genérico que no necesita
 *  estar siempre visible (a diferencia de las alertas, que sí importan). */
export function AccordionItem({ title, children }: AccordionItemProps) {
  return (
    <details className="group glass rounded-[var(--radius-glass-sm)]">
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
