// Une clases condicionales (mini utilidad tipo clsx).
export function cn(
  ...classes: (string | false | null | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}
