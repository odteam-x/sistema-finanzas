"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Sincroniza la franja del sistema (barra de estado en la PWA instalada,
 *  barra de direcciones en el navegador) con lo que hay ARRIBA de la pantalla
 *  actual.
 *
 *  Antes `theme-color` era un valor fijo en el viewport, así que la franja se
 *  quedaba con un teal que no coincidía ni con el hero de Inicio ni con el
 *  fondo del resto de pantallas: se veía como una banda pegada encima de la
 *  app en vez de parte de ella.
 *
 *  Solo Inicio lleva el gradiente de marca a sangre hasta el borde superior;
 *  todo lo demás empieza con el fondo de página. Y ambos cambian con el modo
 *  claro/oscuro, así que el color se lee de las variables CSS ya resueltas en
 *  vez de duplicar los valores acá. */
export function StatusBarColor() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    function apply() {
      const styles = getComputedStyle(root);
      // En Inicio el hero arranca en el extremo oscuro del gradiente.
      const token = pathname === "/dashboard" ? "--brand-grad-from" : "--color-bg";
      const color = styles.getPropertyValue(token).trim();
      if (!color) return;

      // Next emite dos <meta theme-color> con `media` (uno por esquema). Si
      // solo se escribiera encima del primero, en modo oscuro no aplicaría:
      // cuando hay varias, el navegador usa la PRIMERA cuyo media coincida.
      // Por eso este componente NEUTRALIZA las de Next en vez de escribir
      // encima de una sola, y agrega la propia sin `media` (gana siempre).
      //
      // Antes esas dos etiquetas se DESCONECTABAN del DOM con removeChild().
      // Next.js sigue esos nodos en su propio árbol de reconciliación del
      // <head> (los emite desde metadata/viewport en app/layout.tsx); al
      // desconectarlos por fuera de React, en la SIGUIENTE navegación React
      // intentaba reconciliar un nodo cuyo padre ya era null y lanzaba
      // `TypeError: Cannot read properties of null (reading 'removeChild')`
      // sin capturar — abortando el commit de la página nueva a medias. Por
      // eso la URL cambiaba (el pushState ya había ocurrido) pero el
      // contenido se quedaba congelado hasta un segundo intento, que Next
      // resolvía con una recarga completa (que sí funcionaba, al partir de
      // cero). Reproducido con un stack trace real antes de este cambio.
      //
      // La solución: nunca desconectar esos nodos. Se les pone
      // `media="not all"` (el navegador los ignora para siempre) y se
      // dejan en su lugar — Next.js conserva su referencia válida.
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]:not([data-dynamic])')
        .forEach((m) => {
          m.media = "not all";
        });

      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-dynamic]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.dataset.dynamic = "true";
        document.head.appendChild(meta);
      }
      meta.content = color;
    }

    apply();

    // El tema puede cambiar sin que cambie la ruta (ajustes, o "auto" cuando
    // el sistema pasa a oscuro): se observa el atributo que escribe lib/theme.
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["data-mode"] });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
