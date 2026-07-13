// Tipos de las filas de la base de datos (Supabase / Postgres).

export type SalaryKind = "quincena" | "extra";

export interface Salary {
  id: string;
  user_id: string;
  amount: number;
  pay_date: string; // YYYY-MM-DD
  kind: SalaryKind;
  note: string | null;
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
  category_id: string | null;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface SavingsAccount {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
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
