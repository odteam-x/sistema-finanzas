import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  setActiveUser,
  getActiveUser,
  storageKey,
  clearUserStorage,
  CLAVES_DE_DISPOSITIVO,
} from "./storageKey";

/** localStorage de mentira: las pruebas corren en Node, sin navegador. */
function montarStorage() {
  const datos = new Map<string, string>();
  const falso = {
    get length() {
      return datos.size;
    },
    key: (i: number) => [...datos.keys()][i] ?? null,
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: falso };
  return falso;
}

describe("claves de almacenamiento por usuario", () => {
  beforeEach(() => montarStorage());
  afterEach(() => {
    setActiveUser(null);
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("mete el usuario en la clave", () => {
    setActiveUser("usuario-a");
    expect(storageKey("offline-queue")).toBe("cachin:usuario-a:offline-queue");
  });

  it("dos usuarios nunca comparten clave", () => {
    setActiveUser("usuario-a");
    const a = storageKey("offline-queue");
    setActiveUser("usuario-b");
    expect(storageKey("offline-queue")).not.toBe(a);
  });

  it("sin sesión cae en un cajón aparte, no en la clave desnuda", () => {
    setActiveUser(null);
    // Lo importante no es el nombre exacto sino que NO coincida con el de
    // nadie: leer antes de saber quién entró debe devolver vacío, no lo del
    // usuario anterior.
    expect(storageKey("offline-queue")).toBe("cachin:anon:offline-queue");
    setActiveUser("usuario-a");
    expect(storageKey("offline-queue")).not.toBe("cachin:anon:offline-queue");
  });

  it("getActiveUser refleja lo que se fijó", () => {
    expect(getActiveUser()).toBeNull();
    setActiveUser("usuario-a");
    expect(getActiveUser()).toBe("usuario-a");
  });
});

describe("limpieza al cerrar sesión", () => {
  let store: ReturnType<typeof montarStorage>;
  beforeEach(() => {
    store = montarStorage();
  });
  afterEach(() => {
    setActiveUser(null);
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("borra lo del usuario que sale y respeta lo del otro", () => {
    setActiveUser("usuario-a");
    store.setItem(storageKey("offline-queue"), "[]");
    store.setItem(storageKey("primary-account"), "cuenta-1");
    setActiveUser("usuario-b");
    store.setItem(storageKey("offline-queue"), "[]");

    const borradas = clearUserStorage("usuario-a");

    expect(borradas).toBe(2);
    expect(store.getItem("cachin:usuario-a:offline-queue")).toBeNull();
    expect(store.getItem("cachin:usuario-b:offline-queue")).toBe("[]");
  });

  it("no toca las preferencias del DISPOSITIVO", () => {
    setActiveUser("usuario-a");
    store.setItem(storageKey("seen-tips"), "[]");
    store.setItem(CLAVES_DE_DISPOSITIVO.theme, '{"mode":"dark"}');
    store.setItem(CLAVES_DE_DISPOSITIVO.splashSeen, "1");
    store.setItem(CLAVES_DE_DISPOSITIVO.textScale, "1.3");

    clearUserStorage("usuario-a");

    // El tema, la animación de apertura y la escala son del aparato: quien
    // entre después no debería ver la app cambiar de aspecto sin pedirlo.
    expect(store.getItem(CLAVES_DE_DISPOSITIVO.theme)).not.toBeNull();
    expect(store.getItem(CLAVES_DE_DISPOSITIVO.splashSeen)).not.toBeNull();
    expect(store.getItem(CLAVES_DE_DISPOSITIVO.textScale)).not.toBeNull();
    expect(store.getItem("cachin:usuario-a:seen-tips")).toBeNull();
  });

  it("con nada que borrar no falla", () => {
    expect(clearUserStorage("usuario-sin-datos")).toBe(0);
  });
});
