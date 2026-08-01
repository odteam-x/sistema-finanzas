import { describe, expect, it } from "vitest";
import { hrefWith } from "./href";

describe("hrefWith", () => {
  it("conserva los filtros que no se mencionan", () => {
    expect(hrefWith("/cobros", { tipo: "cobro", range: "3m" }, { range: "mes" })).toBe(
      "/cobros?tipo=cobro&range=mes",
    );
  });

  it("quita el filtro con null y con cadena vacía", () => {
    expect(hrefWith("/cobros", { tipo: "cobro", range: "3m" }, { tipo: null })).toBe(
      "/cobros?range=3m",
    );
    expect(hrefWith("/cobros", { tipo: "cobro" }, { tipo: "" })).toBe("/cobros");
  });

  it("devuelve la ruta pelada cuando no queda ningún filtro", () => {
    expect(hrefWith("/cobros", { tipo: undefined, range: undefined })).toBe("/cobros");
  });

  it("agrega un filtro que no estaba", () => {
    expect(hrefWith("/cobros", {}, { range: "mes" })).toBe("/cobros?range=mes");
  });

  it("codifica los valores con espacios", () => {
    expect(hrefWith("/deudas/historial", {}, { acreedor: "Banco Popular" })).toBe(
      "/deudas/historial?acreedor=Banco+Popular",
    );
  });
});
