// Fuente ÚNICA de cálculo del balance de una cuenta.
//
// Antes esta misma resta estaba escrita a mano en 3 archivos distintos
// (lib/summary.ts, app/(app)/balance/page.tsx, app/(app)/metas/page.tsx) —
// tres closures idénticas que había que acordarse de actualizar a la vez.
// Al agregar 'transferencia' como tercer tipo de movimiento, dos de esas
// tres se habrían quedado atrás y los balances habrían dejado de coincidir
// entre pantallas. Ahora todas pasan por acá.
//
// El espejo en SQL es la vista `v_account_balances` (supabase/migration-v9.sql),
// que aplica exactamente esta misma regla del lado de la base.
import type { SavingsMovement } from "./types";

/** Cuánto suma o resta un movimiento AL BALANCE DE UNA CUENTA dada.
 *  Una transferencia afecta a dos cuentas con signos opuestos desde una
 *  sola fila: resta en la de origen, suma en la de destino. */
export function deltaForAccount(m: SavingsMovement, accountId: string): number {
  const amount = Number(m.amount);
  if (m.kind === "transferencia") {
    if (m.account_id === accountId) return -amount;
    if (m.to_account_id === accountId) return amount;
    return 0;
  }
  if (m.account_id !== accountId) return 0;
  return m.kind === "deposito" ? amount : -amount;
}

/** Balance de una cuenta a partir del ledger completo. */
export function balanceOfAccount(movements: SavingsMovement[], accountId: string): number {
  return movements.reduce((sum, m) => sum + deltaForAccount(m, accountId), 0);
}

/** Balance sumado de varias cuentas (ej. "Balance total" del Inicio).
 *  Se calcula cuenta por cuenta, no sumando montos sueltos, para que una
 *  transferencia entre dos cuentas del conjunto se cancele sola en vez de
 *  contarse dos veces. */
export function balanceOfAccounts(movements: SavingsMovement[], accountIds: string[]): number {
  return accountIds.reduce((sum, id) => sum + balanceOfAccount(movements, id), 0);
}

/** ¿Este movimiento representa dinero que ENTRÓ al sistema? Una
 *  transferencia entre cuentas propias no lo es (el dinero ya estaba). */
export function isIncome(m: SavingsMovement): boolean {
  return m.kind === "deposito";
}

/** ¿Este movimiento representa dinero que SALIÓ del sistema? */
export function isExpense(m: SavingsMovement): boolean {
  return m.kind === "retiro";
}
