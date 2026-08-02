import { beforeAll, describe, expect, it } from "vitest";
import {
  CODE_COOKIE_MAX_AGE,
  decryptPersonalCode,
  encryptPersonalCode,
  isPersonalCodeConfigured,
  readCodeCookie,
  signCodeCookie,
} from "./personalCodeCrypto";

beforeAll(() => {
  process.env.PERSONAL_CODE_SECRET = "secreto-de-prueba-no-usar-en-produccion";
});

describe("isPersonalCodeConfigured", () => {
  it("true cuando hay secreto", () => {
    expect(isPersonalCodeConfigured()).toBe(true);
  });
});

describe("cifrado del código", () => {
  it("descifra lo que cifró", async () => {
    const enc = await encryptPersonalCode("123456");
    expect(await decryptPersonalCode(enc)).toBe("123456");
  });

  it("el mismo código cifrado dos veces da valores distintos (IV aleatorio)", async () => {
    const a = await encryptPersonalCode("123456");
    const b = await encryptPersonalCode("123456");
    expect(a).not.toBe(b);
    expect(await decryptPersonalCode(a)).toBe(await decryptPersonalCode(b));
  });

  it("el valor cifrado no contiene el código a la vista", async () => {
    expect(await encryptPersonalCode("123456")).not.toContain("123456");
  });

  it("un valor manipulado no descifra, devuelve null", async () => {
    const enc = await encryptPersonalCode("123456");
    const roto = enc.slice(0, -2) + (enc.endsWith("A") ? "BB" : "AA");
    expect(await decryptPersonalCode(roto)).toBeNull();
  });

  it("basura devuelve null en vez de lanzar", async () => {
    expect(await decryptPersonalCode("no-es-base64-valido!!")).toBeNull();
    expect(await decryptPersonalCode("")).toBeNull();
  });
});

describe("cookie de verificación", () => {
  const USER = "11111111-1111-1111-1111-111111111111";
  const OTRO = "22222222-2222-2222-2222-222222222222";

  it("lee el estado que firmó", async () => {
    expect(await readCodeCookie(await signCodeCookie(USER, "ok"), USER)).toBe("ok");
    expect(await readCodeCookie(await signCodeCookie(USER, "off"), USER)).toBe("off");
  });

  it("no vale para otro usuario aunque se copie el valor", async () => {
    const token = await signCodeCookie(USER, "ok");
    expect(await readCodeCookie(token, OTRO)).toBeNull();
  });

  it("no vale si se manipula la firma", async () => {
    const token = await signCodeCookie(USER, "ok");
    const partes = token.split(".");
    partes[3] = partes[3].slice(0, -2) + "AA";
    expect(await readCodeCookie(partes.join("."), USER)).toBeNull();
  });

  it("no se puede subir de 'off' a 'ok' editando el texto", async () => {
    const token = await signCodeCookie(USER, "off");
    const falso = token.replace(/^off\./, "ok.");
    expect(await readCodeCookie(falso, USER)).toBeNull();
  });

  it("vence sola", async () => {
    const t0 = Date.now();
    const token = await signCodeCookie(USER, "ok", t0);
    expect(await readCodeCookie(token, USER, t0 + (CODE_COOKIE_MAX_AGE - 60) * 1000)).toBe("ok");
    expect(await readCodeCookie(token, USER, t0 + (CODE_COOKIE_MAX_AGE + 60) * 1000)).toBeNull();
  });

  it("sin cookie o con formato raro devuelve null", async () => {
    expect(await readCodeCookie(undefined, USER)).toBeNull();
    expect(await readCodeCookie("cualquier.cosa", USER)).toBeNull();
  });
});
