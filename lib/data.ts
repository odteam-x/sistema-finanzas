// Capa de lectura de datos. Todas las consultas se filtran por el usuario
// autenticado gracias a las políticas RLS de Supabase.
import { createClient } from "./supabase/server";
import type {
  BudgetCategory,
  BudgetPeriodOverride,
  Debt,
  DebtInstallment,
  Expense,
  Goal,
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

export async function getSalaries(): Promise<Salary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("salaries")
    .select("*")
    .order("pay_date", { ascending: false });
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

export async function getSavingsMovements(): Promise<SavingsMovement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("savings_movements")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
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
