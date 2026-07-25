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
  /** false = el usuario aún no confirmó que este cobro realmente llegó
   *  (lo generó runSalaryCatchUp automáticamente); no cuenta como
   *  disponible hasta que se confirme. Ver lib/summary.ts. */
  confirmed: boolean;
}

export type PayFrequency = "semanal" | "quincenal" | "mensual";

export interface SalarySettings {
  user_id: string;
  /** @deprecated reemplazados por frequency/next_pay_date — se dejan solo
   *  para no romper filas existentes, la app ya no los usa. */
  pay_day_1: number;
  pay_day_2: number;
  frequency: PayFrequency;
  /** Próxima fecha de cobro (ancla); null hasta que el usuario la configure. */
  next_pay_date: string | null;
  /** Cuenta a acreditar cuando el ingreso se genera solo (sin formulario). */
  payment_method: AccountType | null;
  default_amount: number; // sueldo por defecto según la frecuencia
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

/** ¿El dinero de la deuda pasó por tus manos? */
export type DebtKind = "prestamo" | "credito";

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
  /** R14: meta que avanza conforme pagas esta deuda (ej. compraste el
   *  celular prestado). El vínculo se crea desde la meta, no desde acá. */
  goal_id: string | null;
  /** 'prestamo' = te dieron el dinero, entra a una cuenta al registrarla.
   *  'credito' = compraste a crédito, nunca tocaste ese dinero.
   *  Distinguirlos evita el doble conteo: sin esto, gastar dinero prestado
   *  se contaba una vez al gastarlo y otra al pagar la deuda. */
  kind: DebtKind;
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

/** Aumento posterior de una deuda existente (le volviste a deber a la misma
 *  persona). Se guarda como historial en vez de sobreescribir el monto
 *  original, así el desglose queda visible. NO mueve dinero: deber más no
 *  es gastar (ver R01 en PLAN.md). */
export interface DebtIncrement {
  id: string;
  debt_id: string;
  user_id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
}

/** Espejo de Deuda pero al revés: dinero que te deben a TI.
 *  'cobro' = alguien te quedó debiendo · 'prestamo' = tú prestaste dinero.
 *  Un cobro pendiente NO suma al balance; solo al recibirlo se acredita. */
export type ReceivableKind = "cobro" | "prestamo";
export type ReceivableStatus = "pendiente" | "parcial" | "cobrada";

export interface Receivable {
  id: string;
  user_id: string;
  kind: ReceivableKind;
  name: string;
  total_amount: number;
  acquired_date: string; // YYYY-MM-DD
  due_date: string | null; // pago único
  payment_type: DebtPaymentType;
  installments_count: number | null;
  installment_amount: number | null;
  frequency: DebtFrequency | null;
  status: ReceivableStatus;
  note: string | null;
  created_at: string;
}

export interface ReceivableInstallment {
  id: string;
  receivable_id: string;
  user_id: string;
  seq: number;
  due_date: string; // YYYY-MM-DD
  amount: number;
  paid: boolean; // "cobrada"
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
  /** null = registrado a mano. 'debt_payment' = generado al pagar una deuda
   *  (source_ref_id apunta a la cuota o deuda pagada) — así un pago de
   *  deuda cuenta como gasto real de la quincena, sin duplicar lógica. */
  source: "debt_payment" | null;
  source_ref_id: string | null;
}

export type AccountType = "ahorro" | "banco" | "efectivo" | "tarjeta_credito" | "tarjeta_debito";

/** DOP es la moneda por defecto y la única que no necesita tasa de cambio
 *  (todo el resto de la app ya asume RD$). USD/EUR son secundarias. */
export type Currency = "DOP" | "USD" | "EUR";

export interface SavingsAccount {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  icon: string | null;
  /** Meta vinculada: si está definido, el saldo derivado de esta cuenta ES
   *  el progreso de esa meta (en vez de Goal.current_amount manual). */
  goal_id: string | null;
  /** Cuenta a la que van los movimientos cuando no se elige una explícita. */
  is_default: boolean;
  created_at: string;
  /** La moneda la define la CUENTA, no cada movimiento — el monto de cada
   *  movimiento de esta cuenta ya está en esta moneda. */
  currency: Currency;
}

/** Tasa de cambio a RD$, editable por el usuario — RD no tiene un feed
 *  automático confiable, así que no se inventa ni se consulta un servicio
 *  externo. Una fila por moneda que el usuario use, no una columna fija por
 *  moneda. */
export interface ExchangeRate {
  id: string;
  user_id: string;
  currency: Currency;
  rate_to_dop: number;
  updated_at: string;
}

/** 'transferencia' = movida entre dos cuentas propias: UNA fila la
 *  representa entera (sale de account_id, entra a to_account_id). No cuenta
 *  como ingreso ni como gasto — el dinero no entró ni salió del sistema. */
export type MovementKind = "deposito" | "retiro" | "transferencia";

/** Qué generó un movimiento del ledger. 'manual' = registrado a mano. */
export type MovementSource =
  | "manual"
  | "salary"
  | "subscription"
  | "debt_payment"
  | "goal_contribution"
  | "receivable_collected"
  /** Desembolso: el dinero que te prestaron entrando a tu cuenta. */
  | "debt_disbursement";

export interface SavingsMovement {
  id: string;
  account_id: string;
  user_id: string;
  kind: MovementKind;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string | null;
  source: MovementSource;
  /** Id de la fila origen (gasto/sueldo/suscripción/deuda) — para limpiar el
   *  movimiento espejo al borrarla. */
  source_ref_id: string | null;
  /** Solo en kind='transferencia': cuenta que RECIBE el dinero. */
  to_account_id: string | null;
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
/** R13: cómo se cuentan los días de una quincena.
 *  'trabajados' = calendario laboral (Modo A) · 'personalizado' = fechas
 *  elegidas a mano en un calendario multi-selección (Modo B). */
export type BudgetBasisMode = "trabajados" | "personalizado";

export interface BudgetPeriodOverride {
  user_id: string;
  period_key: string; // Period.key de lib/periods.ts, ej. "2026-07-Q2"
  workdays: number;
  mode: BudgetBasisMode;
  /** Solo en modo 'personalizado': las fechas exactas elegidas. */
  custom_days: string[];
}

export interface UserProfileRow {
  user_id: string;
  display_name: string | null;
}

export type CsvDateFormat = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";

/** Mapeo de columnas de un CSV bancario, guardado para no volver a
 *  preguntarlo cada vez que se importa un extracto del mismo banco. */
export interface ImportProfile {
  id: string;
  user_id: string;
  name: string;
  date_column: string;
  description_column: string;
  /** Un solo monto con signo — o null si el banco separa débito/crédito. */
  amount_column: string | null;
  debit_column: string | null;
  credit_column: string | null;
  date_format: CsvDateFormat;
  decimal_separator: "." | ",";
  created_at: string;
}
