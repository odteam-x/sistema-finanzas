// Tipos de las filas de la base de datos (Supabase / Postgres).

export type SalaryKind = "quincena" | "extra";

export interface Salary {
  id: string;
  user_id: string;
  amount: number;
  pay_date: string; // YYYY-MM-DD
  kind: SalaryKind;
  note: string | null;
  account_id: string | null;
  tag_id: string | null;
  created_at: string;
}

export interface SalarySettings {
  user_id: string;
  pay_day_1: number; // día del mes del primer pago (ej. 15)
  pay_day_2: number; // día del mes del segundo pago (ej. 30; 31 = fin de mes)
  default_amount: number; // sueldo quincenal por defecto
}

// "trabajado" = override: forzar día laborable (ej. trabajar un domingo/feriado)
export type ExceptionKind = "feriado" | "libre" | "trabajado";

export interface WorkException {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  kind: ExceptionKind;
  label: string | null;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  amount_per_workday: number;
  /** Tope de gasto mensual opcional; null = sin límite (comportamiento actual). */
  monthly_limit: number | null;
  icon: string | null;
  active: boolean;
  sort_order: number;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null; // YYYY-MM-DD
  icon: string | null;
  created_at: string;
}

export type DebtPaymentType = "unico" | "cuotas";
export type DebtFrequency = "semanal" | "quincenal" | "mensual";
export type DebtStatus = "pendiente" | "parcial" | "pagada";

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  acquired_date: string; // YYYY-MM-DD
  due_date: string | null; // pago único
  payment_type: DebtPaymentType;
  installments_count: number | null;
  installment_amount: number | null;
  frequency: DebtFrequency | null;
  status: DebtStatus;
  note: string | null;
  created_at: string;
}

export interface DebtInstallment {
  id: string;
  debt_id: string;
  user_id: string;
  seq: number;
  due_date: string; // YYYY-MM-DD
  amount: number;
  paid: boolean;
  paid_date: string | null;
}

export interface Expense {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  /** @deprecated categoría de presupuesto (por día trabajado) — los gastos
   *  nuevos usan `tag_id` (categoría general), se conserva por datos viejos. */
  category_id: string | null;
  tag_id: string | null;
  amount: number;
  note: string | null;
  account_id: string | null;
  created_at: string;
}

export type AccountType = "ahorro" | "banco" | "efectivo" | "tarjeta_credito" | "tarjeta_debito";

export interface SavingsAccount {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  icon: string | null;
  /** Meta vinculada: si está definido, el saldo derivado de esta cuenta ES
   *  el progreso de esa meta (en vez de Goal.current_amount manual). */
  goal_id: string | null;
  created_at: string;
}

export type MovementKind = "deposito" | "retiro";

export interface SavingsMovement {
  id: string;
  account_id: string;
  user_id: string;
  kind: MovementKind;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
}

export type SubscriptionFrequency = "mensual" | "anual";

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  next_charge_date: string; // YYYY-MM-DD
  /** @deprecated ver Expense.category_id — se conserva por datos viejos. */
  category_id: string | null;
  tag_id: string | null;
  account_id: string | null;
  active: boolean;
  created_at: string;
}

export type FinEventType = "pago" | "deuda" | "suscripcion" | "feriado";

export interface FinEvent {
  type: FinEventType;
  label: string;
  amount?: number;
}

/** Etiqueta general (categoría de gasto real/ingreso/suscripción),
 *  independiente de las líneas de presupuesto por día trabajado. */
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  monthly_limit: number | null;
  created_at: string;
}

/** Override manual de días trabajados para una quincena puntual (si el
 *  usuario no quiere depender del conteo automático del calendario). */
export interface BudgetPeriodOverride {
  user_id: string;
  period_key: string; // Period.key de lib/periods.ts, ej. "2026-07-Q2"
  workdays: number;
}

export interface UserProfileRow {
  user_id: string;
  display_name: string | null;
}
