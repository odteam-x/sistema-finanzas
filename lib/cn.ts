import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Une clases condicionales y resuelve conflictos de Tailwind (la última
// clase de un mismo grupo gana) — necesario para los wrappers de Radix,
// que reciben className desde el sitio que los usa y deben poder
// sobreescribir estilos por defecto.
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
