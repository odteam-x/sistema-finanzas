/** Agrupa una lista por fecha ISO (YYYY-MM-DD), preservando el orden en el
 *  que ya vienen los items (las queries ya traen todo ordenado por fecha
 *  desc) — no reordena, solo arma los grupos consecutivos. */
export function groupByDate<T>(items: T[], dateOf: (item: T) => string): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  for (const item of items) {
    const date = dateOf(item);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.items.push(item);
    } else {
      groups.push({ date, items: [item] });
    }
  }
  return groups;
}
