// Capa de lectura de datos. Todas las consultas se filtran por el usuario
// autenticado gracias a las políticas RLS de Supabase.
import { createClient } from "./supabase/server";
import type {
  BudgetCategory,
  BudgetPeriodOverride,
  Debt,
  DebtIncrement,
  DebtInstallment,
  Expense,
  Goal,
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
};

export async function getSalarySettings(): Promise<
  Omit<SalarySettings, "user_id">
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("salary_settings")
    .select("pay_day_1, pay_day_2, frequency, next_pay_date, payment_method, default_amount")
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

export async function getSalaries(fromISO?: string, toISO?: string): Promise<Salary[]> {
  const supabase = await createClient();
  let q = supabase.from("salaries").select("*");
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
  let q = supabase.from("work_calendar_exceptions").select("*");
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
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getDebts(): Promise<Debt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("debts")
    .select("*")
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
    .order("date", { ascending: false });
  return data ?? [];
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
  let q = supabase.from("expenses").select("*");
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
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getSavingsMovements(fromISO?: string, toISO?: string): Promise<SavingsMovement[]> {
  const supabase = await createClient();
  let q = supabase.from("savings_movements").select("*");
  if (fromISO) q = q.gte("date", fromISO);
  if (toISO) q = q.lte("date", toISO);
  const { data } = await q.order("date", { ascending: false }).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .order("next_charge_date", { ascending: true });
  return data ?? [];
}

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("*").order("name", { ascending: true });
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
