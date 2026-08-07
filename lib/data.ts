// Capa de lectura de datos. Todas las consultas se filtran por el usuario
// autenticado gracias a las políticas RLS de Supabase.
import { createClient } from "./supabase/server";
import type {
  BudgetCategory,
  BudgetPeriodOverride,
  CategorizationRule,
  Creditor,
  Debt,
  DebtIncrement,
  DebtInstallment,
  ExchangeRate,
  Expense,
  Goal,
  ImportProfile,
  Receivable,
  ReceivableInstallment,
  Salary,
  SalarySettings,
  SavingsAccount,
  SavingsMovement,
  Subscription,
  Tag,
  UserProfileRow,
  WorkException,
} from "./types";

export const DEFAULT_SETTINGS: Omit<SalarySettings, "user_id"> = {
  pay_day_1: 15,
  pay_day_2: 30,
  frequency: "quincenal",
  next_pay_date: null,
  payment_method: null,
  default_amount: 0,
  // Sin fila en la base tampoco hay elección: los 15 y 30 de arriba son un
  // punto de partida para que nada reviente, no lo que cobra esta persona.
  confirmed_at: null,
};

export async function getSalarySettings(): Promise<
  Omit<SalarySettings, "user_id">
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("salary_settings")
    .select("pay_day_1, pay_day_2, frequency, next_pay_date, payment_method, default_amount, confirmed_at")
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

export async function getSalaries(fromISO?: string, toISO?: string): Promise<Salary[]> {
  const supabase = await createClient();
  let q = supabase.from("salaries").select("*").is("deleted_at", null);
  if (fromISO) q = q.gte("pay_date", fromISO);
  if (toISO) q = q.lte("pay_date", toISO);
  const { data } = await q.order("pay_date", { ascending: false });
  return data ?? [];
}

export async function getExceptions(
  fromISO?: string,
  toISO?: string,
): Promise<WorkException[]> {
  const supabase = await createClient();
  let q = supabase.from("work_calendar_exceptions").select("*").is("deleted_at", null);
  if (fromISO) q = q.gte("date", fromISO);
  if (toISO) q = q.lte("date", toISO);
  const { data } = await q.order("date", { ascending: true });
  return data ?? [];
}

export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("budget_categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Los acreedores del usuario (v27). Antes eran texto libre dentro de cada
 *  deuda; ahora son filas propias que se reusan entre deudas. */
export async function getCreditors(): Promise<Creditor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("creditors")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getDebts(): Promise<Debt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("debts")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getInstallments(): Promise<DebtInstallment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("debt_installments")
    .select("*")
    .order("due_date", { ascending: true });
  return data ?? [];
}

export async function getDebtIncrements(): Promise<DebtIncrement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("debt_increments")
    .select("*")
    .is("deleted_at", null)
    .order("date", { ascending: false });
  return data ?? [];
}

/** Días que tienen al menos un movimiento. Trae solo la columna `date`
 *  (no las filas completas) para que sea barato: alimenta el selector de
 *  día, que no debe dejar elegir fechas garantizadamente vacías. */
export async function getMovementDays(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("savings_movements")
    .select("date")
    .is("deleted_at", null)
    .order("date", { ascending: true });
  return Array.from(new Set((data ?? []).map((r) => r.date as string)));
}

export interface MovementStats {
  total_ingresos: number;
  total_egresos: number;
  neto: number;
  cantidad: number;
  busiest_date: string | null;
  busiest_count: number | null;
  busiest_neto: number | null;
}

/** R06: agregados de Movimientos calculados en Postgres (no con .reduce()
 *  sobre todo el historial traído a memoria). Respeta los mismos filtros
 *  que la lista. Ver get_movement_stats en supabase/migration-v12.sql. */
export async function getMovementStats(params: {
  from?: string;
  to?: string;
  kind?: "deposito" | "retiro" | null;
  search?: string;
}): Promise<MovementStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_movement_stats", {
    p_from: params.from ?? null,
    p_to: params.to ?? null,
    p_kind: params.kind ?? null,
    p_search: params.search ?? null,
  });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    total_ingresos: Number(row.total_ingresos ?? 0),
    total_egresos: Number(row.total_egresos ?? 0),
    neto: Number(row.neto ?? 0),
    cantidad: Number(row.cantidad ?? 0),
    busiest_date: row.busiest_date ?? null,
    busiest_count: row.busiest_count != null ? Number(row.busiest_count) : null,
    busiest_neto: row.busiest_neto != null ? Number(row.busiest_neto) : null,
  };
}

export async function getReceivables(): Promise<Receivable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("receivables")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getReceivableInstallments(): Promise<ReceivableInstallment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("receivable_installments")
    .select("*")
    .order("due_date", { ascending: true });
  return data ?? [];
}

export async function getExpenses(
  fromISO?: string,
  toISO?: string,
): Promise<Expense[]> {
  const supabase = await createClient();
  let q = supabase.from("expenses").select("*").is("deleted_at", null);
  if (fromISO) q = q.gte("date", fromISO);
  if (toISO) q = q.lte("date", toISO);
  const { data } = await q.order("date", { ascending: false });
  return data ?? [];
}

export async function getSavingsAccounts(): Promise<SavingsAccount[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("savings_accounts")
    .select("*")
    .is("deleted_at", null)
    // Más reciente primero, igual que gastos, movimientos, deudas y cobros.
    // Era la única lista de dinero que mostraba lo más viejo arriba.
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSavingsMovements(fromISO?: string, toISO?: string): Promise<SavingsMovement[]> {
  const supabase = await createClient();
  let q = supabase.from("savings_movements").select("*").is("deleted_at", null);
  if (fromISO) q = q.gte("date", fromISO);
  if (toISO) q = q.lte("date", toISO);
  const { data } = await q.order("date", { ascending: false }).order("created_at", { ascending: false });
  return data ?? [];
}

/** Los N movimientos más recientes (para listas cortas tipo "Últimos
 *  movimientos" en Balance) — a diferencia de `getSavingsMovements()`, no
 *  trae el historial completo, solo lo que de verdad se va a mostrar. */
export async function getRecentMovements(limit: number): Promise<SavingsMovement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("savings_movements")
    .select("*")
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Solo las cuentas dadas — para cuando se necesita el ledger de un
 *  subconjunto chico de cuentas (ej. las vinculadas a una meta) y no tiene
 *  sentido traer el historial de TODAS las cuentas del usuario. */
export async function getSavingsMovementsForAccounts(
  accountIds: string[],
): Promise<SavingsMovement[]> {
  if (accountIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("savings_movements")
    .select("*")
    .is("deleted_at", null)
    .in("account_id", accountIds);
  return data ?? [];
}

/** Cuántos movimientos tiene cada cuenta (para el "N movimientos" de
 *  Balance). Trae solo `account_id` — un octavo del peso de `select("*")`
 *  sobre potencialmente miles de filas, solo para contar. */
export async function getMovementCountsByAccount(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("savings_movements")
    .select("account_id")
    .is("deleted_at", null);
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.account_id as string;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

/** Balance por cuenta calculado en Postgres (vista `v_account_balances`,
 *  ver supabase/migration-v9.sql + migration-v17.sql) en vez de traer el
 *  historial completo de movimientos y sumarlo en JS — la diferencia
 *  importa conforme crece el historial. Si la vista todavía no existe
 *  (migración no corrida) devuelve `null` y el que llama cae de vuelta a
 *  sumar en JS con `getSavingsMovements()`, mismo patrón de degradación que
 *  `getMovementStats()`. */
export async function getAccountBalances(): Promise<Record<string, number> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_account_balances").select("account_id, balance");
  if (error || !data) return null;
  const out: Record<string, number> = {};
  for (const row of data) out[row.account_id as string] = Number(row.balance);
  return out;
}

/** Aportes reales a metas SIN cuenta vinculada — origen 'goal_contribution'
 *  del ledger (ver addProgress en metas/actions.ts). lib/goals.ts los agrupa
 *  por meta. Trae solo lo necesario para sumar, no el movimiento completo. */
export async function getGoalContributionMovements(): Promise<
  Pick<SavingsMovement, "source_ref_id" | "kind" | "amount">[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("savings_movements")
    .select("source_ref_id, kind, amount")
    .eq("source", "goal_contribution")
    .is("deleted_at", null);
  return data ?? [];
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .is("deleted_at", null)
    .order("next_charge_date", { ascending: true });
  return data ?? [];
}

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("*").is("deleted_at", null).order("name", { ascending: true });
  return data ?? [];
}

export async function getPeriodOverrides(): Promise<BudgetPeriodOverride[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("budget_period_overrides").select("*");
  return data ?? [];
}

export async function getUserProfile(): Promise<UserProfileRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_profile").select("*").maybeSingle();
  return data ?? null;
}

export async function getImportProfiles(): Promise<ImportProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("import_profiles").select("*").order("name", { ascending: true });
  return data ?? [];
}

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("exchange_rates").select("*");
  return data ?? [];
}

export async function getCategorizationRules(): Promise<CategorizationRule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categorization_rules")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}
