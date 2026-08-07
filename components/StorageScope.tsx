"use client";

import { setActiveUser } from "@/lib/storageKey";

/**
 * Fija de quién es el localStorage de esta sesión.
 *
 * Se llama en el CUERPO del render, no en un efecto: React renderiza el padre
 * antes que los hijos, así que para cuando cualquier hijo lea una preferencia
 * el usuario ya está puesto. Con un useEffect llegaría tarde — los efectos de
 * los hijos corren ANTES que los del padre, y el primero que leyera caería en
 * el espacio `anon`.
 *
 * No renderiza nada ni guarda estado: es el puente entre el usuario que conoce
 * el servidor y los módulos de cliente que guardan cosas por usuario.
 */
export function StorageScope({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  setActiveUser(userId);
  return <>{children}</>;
}
