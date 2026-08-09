import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Las Server Actions y el chequeo de duplicados hablan con Supabase, así que se
// sustituyen: lo que se prueba aquí es LA GUARDIA, no que addExpense funcione.
const addExpense = vi.fn(async () => ({ ok: true as const }));
const addSalary = vi.fn(async () => ({ ok: true as const }));
const addMovement = vi.fn(async () => ({ ok: true as const }));

vi.mock("@/app/(app)/presupuesto/actions", () => ({ addExpense: (fd: FormData) => addExpense(fd) }));
vi.mock("@/app/(app)/ingresos/actions", () => ({ addSalary: (fd: FormData) => addSalary(fd) }));
vi.mock("@/app/(app)/balance/actions", () => ({ addMovement: (fd: FormData) => addMovement(fd) }));
vi.mock("./offlineDedup", () => ({ isAlreadySynced: async () => false }));

import { flushQueue, getQueue } from "./offlineQueue";
import { setActiveUser, storageKey } from "./storageKey";

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

/** Un pendiente como lo deja `enqueue`, con dueño explícito. */
function pendiente(userId: string | undefined, id = crypto.randomUUID()) {
  return {
    id,
    actionKey: "gasto" as const,
    entries: [["amount", "500"]] as [string, string][],
    createdAt: Date.now(),
    label: "Gasto · RD$500",
    userId,
  };
}

describe("cola offline: guardia de propietario", () => {
  let store: ReturnType<typeof montarStorage>;

  beforeEach(() => {
    store = montarStorage();
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    setActiveUser(null);
    delete (globalThis as unknown as { window?: unknown }).window;
    vi.restoreAllMocks();
  });

  /** Deja la cola de `dueño` en el almacenamiento y activa la sesión de
   *  `sesion`, que es el escenario que importa: quien encoló ya no es quien
   *  está dentro. */
  function preparar(dueño: string | undefined, sesion: string) {
    setActiveUser(dueño ?? "sin-dueno");
    const clave = dueño ? storageKey("offline-queue") : "cachin:huerfano:offline-queue";
    store.setItem(clave, JSON.stringify([pendiente(dueño)]));
    setActiveUser(sesion);
    // La cola cachea en memoria; se fuerza a releer con la sesión nueva.
    store.setItem(storageKey("offline-queue"), JSON.stringify([pendiente(dueño)]));
  }

  it("ENVÍA lo que encoló la misma cuenta", async () => {
    setActiveUser("propietario-1");
    store.setItem(storageKey("offline-queue"), JSON.stringify([pendiente("propietario-1")]));

    const res = await flushQueue();

    expect(addExpense).toHaveBeenCalledTimes(1);
    expect(res.flushed).toBe(1);
    expect(getQueue()).toHaveLength(0);
  });

  it("NO envía lo que encoló otra cuenta — es el caso de dinero", async () => {
    preparar("propietario-2", "intruso-2");

    const res = await flushQueue();

    // Lo importante no es que se descarte: es que NO SE ENVÍE. Enviarlo
    // registraría el gasto de A dentro de la cuenta de B.
    expect(addExpense).not.toHaveBeenCalled();
    expect(res.flushed).toBe(0);
  });

  it("NO envía lo que no dice de quién es", async () => {
    // Pendientes guardados antes de la Fase 27, cuando la cola era global. No
    // se puede saber de quién son, así que tampoco se mandan.
    preparar(undefined, "intruso-3");

    await flushQueue();

    expect(addExpense).not.toHaveBeenCalled();
  });

  it("la caché en memoria no sobrevive a un cambio de sesión", async () => {
    // Lo encontró esta misma suite. `cachedQueue` era de módulo y no se
    // invalidaba al cambiar de usuario, así que getQueue() devolvía los
    // pendientes del anterior. Hoy no muerde en producción porque cerrar sesión
    // navega con window.location y el módulo se reinstancia — pero eso es
    // depender de un detalle de otro archivo.
    setActiveUser("propietario-5");
    store.setItem(storageKey("offline-queue"), JSON.stringify([pendiente("propietario-5")]));
    expect(getQueue()).toHaveLength(1);

    setActiveUser("otro-5");
    expect(getQueue()).toHaveLength(0);
  });

  it("descarta el ajeno pero envía el propio en la misma pasada", async () => {
    setActiveUser("propietario-4");
    store.setItem(
      storageKey("offline-queue"),
      JSON.stringify([pendiente("ajeno-4", "ajeno"), pendiente("propietario-4", "propio")]),
    );

    const res = await flushQueue();

    expect(addExpense).toHaveBeenCalledTimes(1);
    expect(res.flushed).toBe(1);
    expect(getQueue()).toHaveLength(0);
  });
});
