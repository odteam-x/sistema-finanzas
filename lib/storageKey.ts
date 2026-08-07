// Claves de localStorage con el usuario dentro.
//
// EL PROBLEMA. Todas las claves eran globales del navegador: `cachin:lock`,
// `cachin:offline-queue`… Con dos personas en el mismo dispositivo —o una que
// cierra sesión y otra que entra— todo ese estado se heredaba.
//
// El peor caso es de dinero, no de comodidad: `cachin:offline-queue` guarda
// gastos y movimientos pendientes de enviar. Si A encola un gasto sin señal,
// cierra sesión, y B entra con conexión, el flush lo mandaba CONTRA LA SESIÓN
// DE B — el dinero de una persona registrado en la cuenta de otra.
//
// LA REGLA. Todo lo que sea dato del USUARIO lleva su id en la clave. Lo que
// sea preferencia del DISPOSITIVO se queda global, y cada excepción está
// justificada abajo una por una.

/** Id del usuario de la sesión activa. Lo fija <StorageScope> al montar el
 *  layout privado, antes de que ningún hijo lea nada. */
let usuarioActivo: string | null = null;

export function setActiveUser(id: string | null): void {
  usuarioActivo = id;
}

export function getActiveUser(): string | null {
  return usuarioActivo;
}

/**
 * Clave por usuario: `cachin:<userId>:<nombre>`.
 *
 * Sin sesión conocida devuelve un espacio `anon` en vez de la clave desnuda.
 * Es deliberado: si algo lee o escribe antes de que la sesión esté lista, va a
 * un cajón aparte y no puede leer ni pisar los datos de nadie. Fallar hacia
 * "no encuentro nada" es seguro; fallar hacia "leo lo del anterior" no.
 */
export function storageKey(nombre: string): string {
  return `cachin:${usuarioActivo ?? "anon"}:${nombre}`;
}

/** Claves que NO llevan usuario, con su razón. Se listan aquí para que la
 *  excepción sea una decisión visible y no un olvido. */
export const CLAVES_DE_DISPOSITIVO = {
  /** Si ya se vio la animación de apertura. Es del aparato, no de la cuenta:
   *  volver a verla al cambiar de usuario sería un error, no una función. */
  splashSeen: "cachin:splash-seen",
  /** Claro/oscuro/automático. Por diseño es del dispositivo desde que existe
   *  —un teléfono se usa de noche y un escritorio de día— y así está
   *  documentado en lib/theme.ts. */
  theme: "bolsillo-seguro:theme",
  /** Escala de texto. Vive global porque la aplica un script inline ANTES del
   *  primer pintado, y en ese momento todavía no se sabe quién entró: una
   *  clave con usuario obligaría a pintar primero y saltar después, que es
   *  justo lo que ese script existe para evitar.
   *  No filtra entre cuentas porque el valor de la CUENTA manda al cargar
   *  (ver PersonalizeProvider): si B entra en el aparato de A, la escala de B
   *  pisa la que había. */
  textScale: "bolsillo-seguro:text-scale",
} as const;

/** Borra todo lo del usuario indicado. Lo usa el cierre de sesión.
 *
 *  Barre por PREFIJO en vez de por una lista de nombres: una lista se queda
 *  desactualizada en cuanto alguien añade una clave nueva y no se acuerda de
 *  agregarla aquí — y el olvido no se nota hasta que dos personas comparten el
 *  aparato. Lo del dispositivo no lleva ese prefijo, así que sobrevive. */
export function clearUserStorage(userId: string): number {
  if (typeof window === "undefined") return 0;
  const prefijo = `cachin:${userId}:`;
  try {
    const aBorrar: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefijo)) aBorrar.push(k);
    }
    aBorrar.forEach((k) => window.localStorage.removeItem(k));
    return aBorrar.length;
  } catch {
    // localStorage no disponible (modo privado, cuota). No hay nada que
    // limpiar porque tampoco se pudo guardar nada.
    return 0;
  }
}
