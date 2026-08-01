/** Misma normalización que el índice único uniq_tags_user_name_alive
 *  (migration-v29). Vive acá y no dentro de una acción porque si el aviso
 *  amable de la UI y la restricción de la base no normalizan igual, el usuario
 *  ve "ya tienes esa etiqueta" para una que sí puede crear, o al revés. */
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

/** La etiqueta que ya ocupa ese nombre, si la hay. */
export function findTagByName<T extends { name: string }>(
  tags: T[],
  name: string,
): T | undefined {
  const target = normalizeTagName(name);
  return tags.find((t) => normalizeTagName(t.name) === target);
}
