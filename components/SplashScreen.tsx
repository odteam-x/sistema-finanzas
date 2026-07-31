"use client";

// Momento de marca al abrir la app. NO es el splash nativo del sistema (ese
// lo dibuja el SO desde manifest.json al instalar la PWA): esto es la
// animación propia que corre ya dentro de la app, cubriendo la ventana en la
// que el Server Component de la ruta todavía está resolviendo sus datos.
//
// Es una capa fija POR ENCIMA del contenido, no un reemplazo: los children
// del layout se montan y sus datos se resuelven por detrás mientras la
// animación corre, así que no suma espera — la tapa.
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Una vez por sesión de pestaña. Cambiar de sección no remonta el layout
 *  raíz, así que con el estado local bastaría para la navegación; el
 *  sessionStorage cubre el caso del recargar (pull-to-refresh dentro de la
 *  PWA instalada), donde el layout SÍ se remonta. Al cerrar la pestaña se
 *  limpia solo, que es justo lo que queremos: la próxima apertura real
 *  vuelve a saludar. */
const SEEN_KEY = "cachin:splash-seen";

/** Corto a propósito: es una firma de marca, no una pantalla de carga. */
const HOLD_MS = 900;

export function SplashScreen() {
  // Arranca visible también en el HTML del servidor para que no haya un
  // parpadeo de contenido antes de la animación. Si ya se vio en esta
  // pestaña, el efecto de abajo la retira en el primer frame.
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
      if (!seen) window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // sessionStorage no disponible (modo privado, cuota llena): se muestra
      // igual, solo no se recuerda entre recargas.
    }
    // Si ya se vio, se retira en el siguiente tick en vez de aguantar: sale
    // antes de que el ojo la registre, sin romper la coherencia con el HTML
    // que vino del servidor (donde siempre está presente).
    const t = setTimeout(() => setVisible(false), seen ? 0 : HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          // aria-hidden + pointer-events-none: es decorativa y efímera; no
          // debe robar el foco ni anunciarse a un lector de pantalla, que ya
          // está leyendo el contenido real de abajo.
          aria-hidden="true"
          className="fixed inset-0 z-[200] grid place-items-center bg-gradient-brand pointer-events-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
        >
          <motion.img
            src="/icons/logo-mark-white.png"
            alt=""
            width={96}
            height={96}
            className="size-24 object-contain"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
