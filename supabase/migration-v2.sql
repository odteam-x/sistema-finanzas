-- =============================================================================
-- Migración v2: Cuentas generalizadas + límite mensual por categoría.
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
--
-- Es 100% aditivo: solo agrega columnas nuevas (con "if not exists"), no
-- borra ni renombra nada. Tus datos actuales de Ahorros/Presupuesto no se
-- ven afectados — las columnas nuevas quedan con su valor por defecto
-- ('ahorro' para cuentas existentes, NULL para el resto).
-- =============================================================================

-- "savings_accounts" ahora puede representar cualquier tipo de cuenta, no
-- solo ahorro (banco, efectivo, tarjeta). Tus cuentas existentes quedan
-- marcadas como 'ahorro' automáticamente.
alter table public.savings_accounts
  add column if not exists type text not null default 'ahorro'
    check (type in ('ahorro', 'banco', 'efectivo', 'tarjeta_credito', 'tarjeta_debito'));

-- Ingresos y gastos pueden asociarse opcionalmente a una cuenta.
alter table public.salaries
  add column if not exists account_id uuid references public.savings_accounts (id) on delete set null;
alter table public.expenses
  add column if not exists account_id uuid references public.savings_accounts (id) on delete set null;

-- Una categoría de presupuesto puede tener, además del monto por día
-- trabajado, un límite de gasto mensual opcional (con alerta en la UI).
alter table public.budget_categories
  add column if not exists monthly_limit numeric(12, 2);

create index if not exists idx_salaries_account on public.salaries (account_id);
create index if not exists idx_expenses_account on public.expenses (account_id);
