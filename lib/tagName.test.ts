import { describe, expect, it } from "vitest";
import { findTagByName, normalizeTagName } from "./tagName";

const tags = [{ name: "Salud" }, { name: "Colmado" }, { name: "Luz (EDE)" }];

describe("normalizeTagName", () => {
  it("ignora mayúsculas y espacios de sobra", () => {
    expect(normalizeTagName("  Salud ")).toBe("salud");
    expect(normalizeTagName("SALUD")).toBe(normalizeTagName("salud"));
  });

  it("un nombre ya normalizado no cambia", () => {
    expect(normalizeTagName("colmado")).toBe("colmado");
  });
});

describe("findTagByName", () => {
  it("encuentra la etiqueta aunque cambie el formato", () => {
    expect(findTagByName(tags, " colmado ")?.name).toBe("Colmado");
    expect(findTagByName(tags, "SALUD")?.name).toBe("Salud");
  });

  it("no confunde nombres parecidos", () => {
    expect(findTagByName(tags, "Luz")).toBeUndefined();
  });

  it("sin coincidencia devuelve undefined", () => {
    expect(findTagByName(tags, "Transporte")).toBeUndefined();
  });
});
