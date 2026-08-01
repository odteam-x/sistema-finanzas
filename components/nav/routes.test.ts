import { describe, expect, it } from "vitest";
import { NAV_GROUPS, NAV_ROUTES, SECONDARY_GROUPS, SECONDARY_ROUTES } from "./routes";

const hrefs = (gs: { routes: { href: string }[] }[]) =>
  gs.flatMap((g) => g.routes.map((r) => r.href)).sort();

describe("agrupación de la navegación", () => {
  it("no pierde ninguna ruta al agrupar", () => {
    expect(hrefs(NAV_GROUPS)).toEqual(NAV_ROUTES.map((r) => r.href).sort());
  });

  it("no repite ninguna ruta en dos grupos", () => {
    const all = hrefs(NAV_GROUPS);
    expect(new Set(all).size).toBe(all.length);
  });

  it("el menú Más enseña exactamente las secundarias", () => {
    expect(hrefs(SECONDARY_GROUPS)).toEqual(SECONDARY_ROUTES.map((r) => r.href).sort());
  });

  it("no emite grupos vacíos", () => {
    expect([...NAV_GROUPS, ...SECONDARY_GROUPS].every((g) => g.routes.length > 0)).toBe(true);
  });

  it("el menú Más no incluye ninguna ruta de la tab bar", () => {
    const secondary = hrefs(SECONDARY_GROUPS);
    for (const r of NAV_ROUTES.filter((r) => r.primary)) {
      expect(secondary).not.toContain(r.href);
    }
  });
});
