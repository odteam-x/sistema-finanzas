// Cola de operaciones offline-first (Bloque 12) — acotada a propósito a los
// 3 formularios rápidos del FAB (Gasto/Ingreso/Movimiento): es el caso real
// de "estoy en la calle, sin señal, necesito anotar esto ahora" que la spec
// pide resolver. Encolar CUALQUIER Server Action de la app exigiría un
// registro mucho más grande y reconstruir cada formulario tal cual estaba;
// estos 3 son los de mayor uso "sobre la marcha", así que son los que se
// resuelven acá — el resto de formularios de la app sigue fallando sin red
// como antes (limitación conocida, no un olvido).
//
// localStorage, no IndexedDB: el volumen esperado es bajísimo (unos pocos
// pendientes, nunca cientos) — mismo criterio que el resto de preferencias
// locales del proyecto (lib/preferences.ts, lib/appLock.ts).
import { addExpense } from "@/app/(app)/presupuesto/actions";
import { addSalary } from "@/app/(app)/ingresos/actions";
import { addMovement } from "@/app/(app)/balance/actions";
import type { ActionResult } from "./actions-shared";

const QUEUE_KEY = "cachin:offline-queue";

export type QueuedActionKey = "gasto" | "ingreso" | "movimiento";

export interface QueuedItem {
  id: string;
  actionKey: QueuedActionKey;
  entries: [string, string][];
  createdAt: number;
  /** Texto corto para el indicador ("Gasto · RD$500"), calculado por quien
   *  encola — este módulo no sabe (ni le importa) qué campos tiene cada
   *  formulario. */
  label: string;
}

const EMPTY_QUEUE: QueuedItem[] = [];
let cachedQueue: QueuedItem[] | null = null;
type Listener = () => void;
const listeners = new Set<Listener>();

function readFromStorage(): QueuedItem[] {
  if (typeof window === "undefined") return EMPTY_QUEUE;
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedItem[]) : EMPTY_QUEUE;
  } catch {
    return EMPTY_QUEUE;
  }
}

function writeQueue(next: QueuedItem[]): void {
  cachedQueue = next;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    // localStorage lleno/no disponible: la cola vive solo en memoria de esta
    // pestaña — no rompe el resto de la app, solo no sobrevive un refresh.
  }
  for (const l of listeners) l();
}

/** Referencia ESTABLE mientras nada cambie — igual que lib/appLock.ts, para
 *  que useSyncExternalStore no entre en bucle de re-render. */
export function getQueue(): QueuedItem[] {
  if (cachedQueue === null) cachedQueue = readFromStorage();
  return cachedQueue;
}

export function getQueueServerSnapshot(): QueuedItem[] {
  return EMPTY_QUEUE;
}

export function subscribeToQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function enqueue(actionKey: QueuedActionKey, formData: FormData, label: string): void {
  const entries: [string, string][] = Array.from(formData.entries()).map(([k, v]) => [k, String(v)]);
  const item: QueuedItem = {
    id: crypto.randomUUID(),
    actionKey,
    entries,
    createdAt: Date.now(),
    label,
  };
  writeQueue([...getQueue(), item]);
}

function removeFromQueue(id: string): void {
  writeQueue(getQueue().filter((i) => i.id !== id));
}

function entriesToFormData(entries: [string, string][]): FormData {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

/** Envoltorio que un FormModal puede usar como su `action`: intenta la
 *  Server Action real primero; si no hay red (detectable de antemano) o la
 *  llamada falla por red (no por validación — eso sigue mostrándose como
 *  error normal), encola y responde éxito optimista para que el modal se
 *  cierre. */
export async function submitOfflineAware(
  actionKey: QueuedActionKey,
  action: (formData: FormData) => Promise<ActionResult>,
  formData: FormData,
  label: string,
): Promise<ActionResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    enqueue(actionKey, formData, label);
    return { ok: true };
  }
  try {
    return await action(formData);
  } catch {
    enqueue(actionKey, formData, label);
    return { ok: true };
  }
}

const REGISTRY: Record<QueuedActionKey, (formData: FormData) => Promise<ActionResult>> = {
  gasto: addExpense,
  ingreso: addSalary,
  movimiento: addMovement,
};

/** Reintenta cada pendiente EN ORDEN. Un fallo de validación (ok:false) dea
 *  el ítem en la cola para que el usuario lo revise — nunca se descarta en
 *  silencio. Un fallo de red corta el intento entero (todavía sin señal),
 *  se reintenta en el próximo "online" o próxima carga de la app. */
export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  const items = getQueue();
  let flushed = 0;
  for (const item of items) {
    try {
      const res = await REGISTRY[item.actionKey](entriesToFormData(item.entries));
      if (res?.ok) {
        removeFromQueue(item.id);
        flushed++;
      }
    } catch {
      break;
    }
  }
  return { flushed, remaining: getQueue().length };
}
