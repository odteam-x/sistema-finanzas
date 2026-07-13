-- =============================================================================
-- Módulo Ahorros — tablas adicionales.
-- Ejecuta este script en: Supabase Dashboard → SQL Editor → New query.
-- (Ya debes tener aplicado supabase/schema.sql antes.)
-- =============================================================================

-- Cuentas de ahorro (ej. Banco, Efectivo, Alcancía)
create table if not exists public.savings_accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  icon       text,
  created_at timestamptz not null default now()
);

-- Movimientos: depósitos y retiros. El saldo se deriva de estos.
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

create index if not exists idx_savings_accounts_user on public.savings_accounts (user_id, created_at);
create index if not exists idx_savings_movements_account on public.savings_movements (account_id, date desc);
create index if not exists idx_savings_movements_user on public.savings_movements (user_id, date desc);

alter table public.savings_accounts  enable row level security;
alter table public.savings_movements enable row level security;

do $$
declare
  t text;
  tables text[] := array['savings_accounts', 'savings_movements'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);

    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
