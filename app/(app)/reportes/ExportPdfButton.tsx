"use client";

import { Icon } from "@/components/ui/Icon";

/** Reusa el HTML ya renderizado de la página (con estilos de impresión en
 *  globals.css) en vez de generar el PDF aparte con una librería — el
 *  usuario elige "Guardar como PDF" en el diálogo nativo de impresión. */
export function ExportPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 rounded-full font-semibold min-h-11 px-4 text-sm glass text-ink hover:brightness-[0.97] active:brightness-95 cursor-pointer"
    >
      <Icon name="download" size={16} />
      Exportar PDF
    </button>
  );
}
