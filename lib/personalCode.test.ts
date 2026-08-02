import { describe, expect, it } from "vitest";
import { isValidPersonalCode, sanitizePersonalCode } from "./personalCode";

describe("isValidPersonalCode", () => {
  it("acepta exactamente 6 dígitos", () => {
    expect(isValidPersonalCode("123456")).toBe(true);
    expect(isValidPersonalCode("000000")).toBe(true);
  });

  it("rechaza cualquier largo distinto de 6", () => {
    expect(isValidPersonalCode("12345")).toBe(false);
    expect(isValidPersonalCode("1234567")).toBe(false);
    expect(isValidPersonalCode("")).toBe(false);
  });

  it("rechaza lo que no sean dígitos", () => {
    expect(isValidPersonalCode("12345a")).toBe(false);
    expect(isValidPersonalCode("12 456")).toBe(false);
    expect(isValidPersonalCode("１２３４５６")).toBe(false); // dígitos de ancho completo
  });

  it("no acepta espacios alrededor", () => {
    expect(isValidPersonalCode(" 123456 ")).toBe(false);
  });
});

describe("sanitizePersonalCode", () => {
  it("quita todo lo que no sea dígito", () => {
    expect(sanitizePersonalCode("12 34-56")).toBe("123456");
  });

  it("recorta a 6 dígitos", () => {
    expect(sanitizePersonalCode("1234567890")).toBe("123456");
  });

  it("lo que sanea siempre es válido si llega a 6", () => {
    const out = sanitizePersonalCode("Tu código es 987654, no lo compartas");
    expect(out).toBe("987654");
    expect(isValidPersonalCode(out)).toBe(true);
  });

  it("sin dígitos devuelve cadena vacía", () => {
    expect(sanitizePersonalCode("abc")).toBe("");
  });
});
