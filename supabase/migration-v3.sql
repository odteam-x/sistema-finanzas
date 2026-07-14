-- =============================================================================
-- Migración v3: Suscripciones recurrentes.
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
--
-- Es aditivo: solo crea una tabla nueva, no toca nada existente.
-- =============================================================================

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

create index if not exists idx_subscriptions_user_next on public.subscriptions (user_id, next_charge_date);

alter table public.subscriptions enable row level security;

do $$
declare
  t text;
  tables text[] := array['subscriptions'];
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
