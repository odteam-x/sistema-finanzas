/** Constructor de las URLs de filtro de las listas.
 *
 *  Existe porque el mismo `hrefFor` se copió a mano en cada pantalla y cada
 *  copia decidía por su cuenta qué arrastrar: en Cobros, cambiar de pestaña
 *  reescribía la URL a `/cobros?tipo=x` y se llevaba por delante cualquier
 *  otro filtro puesto.
 *
 *  Una sola regla: la clave que NO se menciona conserva su valor; la clave
 *  presente con `null`, `undefined` o "" quita ese filtro. */
export function hrefWith(
  pathname: string,
  current: Record<string, string | undefined>,
  next: Record<string, string | null | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const key of Object.keys({ ...current, ...next })) {
    const value = key in next ? next[key] : current[key];
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
