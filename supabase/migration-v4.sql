-- =============================================================================
-- Migración v4: etiquetas generales, override de días trabajados, vínculo
-- ahorro↔meta, perfil de usuario en BD.
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- 100% aditivo: solo agrega tablas/columnas nuevas. budget_categories y su
-- uso actual (presupuesto por día trabajado) quedan intactos.
-- =============================================================================

-- Etiquetas generales reutilizables (ingresos, gastos, suscripciones).
-- Reemplaza budget_categories como "categoría" para el gasto real hacia
-- adelante; budget_categories sigue existiendo tal cual, solo para el
-- cálculo de presupuesto por día trabajado.
create table if not exists public.tags (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  color         text not null default 'primary',
  monthly_limit numeric(12, 2),
  created_at    timestamptz not null default now()
);

alter table public.salaries
  add column if not exists tag_id uuid references public.tags (id) on delete set null;
alter table public.expenses
  add column if not exists tag_id uuid references public.tags (id) on delete set null;
alter table public.subscriptions
  add column if not exists tag_id uuid references public.tags (id) on delete set null;

-- Override manual de días trabajados por quincena (si el usuario no quiere
-- usar el conteo automático del calendario). period_key = Period.key de
-- lib/periods.ts, ej. "2026-07-Q2".
create table if not exists public.budget_period_overrides (
  user_id    uuid not null references auth.users (id) on delete cascade,
  period_key text not null,
  workdays   int not null,
  primary key (user_id, period_key)
);

-- Vincula una cuenta a una meta: el saldo derivado de savings_movements
-- pasa a ser la fuente de verdad del progreso de esa meta.
alter table public.savings_accounts
  add column if not exists goal_id uuid references public.goals (id) on delete set null;

-- Perfil de usuario (nombre para mostrar) — antes solo en localStorage.
create table if not exists public.user_profile (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text
);

create index if not exists idx_tags_user on public.tags (user_id, name);
create index if not exists idx_salaries_tag on public.salaries (tag_id);
create index if not exists idx_expenses_tag on public.expenses (tag_id);
create index if not exists idx_subscriptions_tag on public.subscriptions (tag_id);
create index if not exists idx_savings_accounts_goal on public.savings_accounts (goal_id);
create index if not exists idx_period_overrides_user on public.budget_period_overrides (user_id);

alter table public.tags enable row level security;
alter table public.budget_period_overrides enable row level security;
alter table public.user_profile enable row level security;

do $$
declare
  t text;
  tables text[] := array['tags', 'budget_period_overrides', 'user_profile'];
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
