"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Reusa el HTML ya renderizado de la página (con estilos de impresión en
 *  globals.css) en vez de generar el PDF aparte con una librería — el
 *  usuario elige "Guardar como PDF" en el diálogo nativo de impresión. */
export function ExportPdfButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      <Icon name="download" size={16} />
      Exportar PDF
    </Button>
  );
}
