-- =============================================================================
-- Finanzas Personales — Esquema de base de datos (Supabase / Postgres)
-- Ejecuta este script completo en: Supabase Dashboard → SQL Editor → New query
-- Es idempotente-ish: usa "if not exists" donde puede. Seguro para 1 usuario.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Tablas
-- ----------------------------------------------------------------------------

-- Configuración de sueldo (una fila por usuario)
create table if not exists public.salary_settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  pay_day_1      int not null default 15,
  pay_day_2      int not null default 30,
  default_amount numeric(12, 2) not null default 0
);

-- Pagos de sueldo recibidos (quincena o extra)
create table if not exists public.salaries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     numeric(12, 2) not null,
  pay_date   date not null,
  kind       text not null default 'quincena' check (kind in ('quincena', 'extra')),
  note       text,
  created_at timestamptz not null default now()
);

-- Excepciones del calendario laboral (feriados, días libres extra, overrides)
create table if not exists public.work_calendar_exceptions (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date    date not null,
  kind    text not null check (kind in ('feriado', 'libre', 'trabajado')),
  label   text,
  unique (user_id, date)
);

-- Categorías de gasto diario (pasaje, desayuno, etc.). monthly_limit es
-- opcional: si se define, la categoría además muestra una barra de
-- progreso de gasto real del mes vs. ese tope, con alerta ámbar/roja.
create table if not exists public.budget_categories (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  amount_per_workday numeric(12, 2) not null default 0,
  monthly_limit      numeric(12, 2),
  icon               text,
  active             boolean not null default true,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now()
);

-- Metas / vision board
create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  target_amount  numeric(12, 2) not null,
  current_amount numeric(12, 2) not null default 0,
  deadline       date,
  icon           text,
  created_at     timestamptz not null default now()
);

-- Deudas
create table if not exists public.debts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  total_amount       numeric(12, 2) not null,
  acquired_date      date not null,
  due_date           date,
  payment_type       text not null default 'unico' check (payment_type in ('unico', 'cuotas')),
  installments_count int,
  installment_amount numeric(12, 2),
  frequency          text check (frequency in ('semanal', 'quincenal', 'mensual')),
  status             text not null default 'pendiente' check (status in ('pendiente', 'parcial', 'pagada')),
  note               text,
  created_at         timestamptz not null default now()
);

-- Cuotas de deudas
create table if not exists public.debt_installments (
  id        uuid primary key default gen_random_uuid(),
  debt_id   uuid not null references public.debts (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  seq       int not null,
  due_date  date not null,
  amount    numeric(12, 2) not null,
  paid      boolean not null default false,
  paid_date date
);

-- Gasto real registrado (opcional, para comparar vs presupuesto)
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  category_id uuid references public.budget_categories (id) on delete set null,
  amount      numeric(12, 2) not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- Cuentas (ahorro, banco, efectivo, tarjeta) — el saldo se deriva de
-- savings_movements, sin importar el tipo.
create table if not exists public.savings_accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  type       text not null default 'ahorro'
             check (type in ('ahorro', 'banco', 'efectivo', 'tarjeta_credito', 'tarjeta_debito')),
  icon       text,
  created_at timestamptz not null default now()
);

-- Movimientos de ahorro (depósitos y retiros); el saldo se deriva de aquí.
create table if not exists public.savings_movements (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.savings_accounts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('deposito', 'retiro')),
  amount     numeric(12, 2) not null,
  date       date not null,
  note       text,
  created_at timestamptz not null default now()
);

-- Asociar ingresos y gastos a una cuenta (opcional). Se agrega aquí, no en
-- los "create table" de arriba, porque savings_accounts se define después
-- de salaries en este archivo.
alter table public.salaries
  add column if not exists account_id uuid references public.savings_accounts (id) on delete set null;
alter table public.expenses
  add column if not exists account_id uuid references public.savings_accounts (id) on delete set null;

-- Suscripciones recurrentes (streaming, gimnasio, etc.)
create table if not exists public.subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  amount           numeric(12, 2) not null,
  frequency        text not null default 'mensual' check (frequency in ('mensual', 'anual')),
  next_charge_date date not null,
  category_id      uuid references public.budget_categories (id) on delete set null,
  account_id       uuid references public.savings_accounts (id) on delete set null,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
create index if not exists idx_salaries_user_date on public.salaries (user_id, pay_date desc);
create index if not exists idx_exceptions_user_date on public.work_calendar_exceptions (user_id, date);
create index if not exists idx_categories_user on public.budget_categories (user_id, sort_order);
create index if not exists idx_goals_user on public.goals (user_id, created_at desc);
create index if not exists idx_debts_user on public.debts (user_id, created_at desc);
create index if not exists idx_installments_user_due on public.debt_installments (user_id, due_date);
create index if not exists idx_installments_debt on public.debt_installments (debt_id, seq);
create index if not exists idx_expenses_user_date on public.expenses (user_id, date desc);
create index if not exists idx_savings_accounts_user on public.savings_accounts (user_id, created_at);
create index if not exists idx_savings_movements_account on public.savings_movements (account_id, date desc);
create index if not exists idx_savings_movements_user on public.savings_movements (user_id, date desc);
create index if not exists idx_salaries_account on public.salaries (account_id);
create index if not exists idx_expenses_account on public.expenses (account_id);
create index if not exists idx_subscriptions_user_next on public.subscriptions (user_id, next_charge_date);

-- ----------------------------------------------------------------------------
-- Row Level Security: cada usuario solo ve/edita sus propias filas
-- ----------------------------------------------------------------------------
alter table public.salary_settings          enable row level security;
alter table public.salaries                 enable row level security;
alter table public.work_calendar_exceptions enable row level security;
alter table public.budget_categories        enable row level security;
alter table public.goals                     enable row level security;
alter table public.debts                     enable row level security;
alter table public.debt_installments        enable row level security;
alter table public.expenses                  enable row level security;
alter table public.savings_accounts          enable row level security;
alter table public.savings_movements         enable row level security;
alter table public.subscriptions             enable row level security;

do $$
declare
  t text;
  tables text[] := array[
    'salary_settings','salaries','work_calendar_exceptions','budget_categories',
    'goals','debts','debt_installments','expenses',
    'savings_accounts','savings_movements','subscriptions'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);

    execute format(
      'create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
