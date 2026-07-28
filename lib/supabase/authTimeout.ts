/** Ata un límite de tiempo a una llamada de autenticación que puede colgarse
 *  mucho más de lo razonable para una petición de servidor.
 *
 *  Causa raíz (confirmada leyendo el SDK, `node_modules/@supabase/auth-js`):
 *  cuando la sesión está vencida, `getSession()` —y por dentro también
 *  `getUser()`/`getClaims()` sin un JWT explícito, que llaman a
 *  `getSession()`— dispara un refresco de token. Si esa llamada de red falla
 *  con un error "reintentable" (un hipo de red, no un rechazo de auth), el
 *  SDK reintenta con backoff exponencial: 200ms, 400ms, 800ms, 1.6s, 3.2s,
 *  6.4s, 12.8s… acotado por su propia constante `AUTO_REFRESH_TICK_DURATION_MS`
 *  a 30s — la suma real ronda los 25-28s antes de rendirse.
 *
 *  Ese comportamiento tiene sentido para una app de navegador de larga vida
 *  que prefiere insistir antes que perder la sesión por un hipo pasajero.
 *  No tiene ningún sentido para una petición de servidor con alguien
 *  esperando a que la pantalla cargue: preferimos fallar rápido (tratar la
 *  sesión como inválida, lo que manda a /login) a congelar la navegación
 *  20-28 segundos. Perder la sesión en el peor caso y tener que iniciar
 *  sesión de nuevo es una degradación aceptable; una pantalla congelada no. */
export function withAuthTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}
