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
      // Por eso este componente se queda con una sola meta, sin media, y
      // retira las demás.
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-dynamic]');
      if (!meta) {
        document
          .querySelectorAll('meta[name="theme-color"]')
          .forEach((m) => m.parentNode?.removeChild(m));
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
