-- =============================================================================
-- Migración v21 — Bloque 8b: multi-moneda (USD/EUR secundarias)
--
-- RD no tiene un feed de tasa de cambio automático confiable (a diferencia
-- de otros países) — la tasa es editable por el usuario, no se inventa ni
-- se consulta a un servicio externo. Cada CUENTA tiene una moneda (no cada
-- movimiento): "esta cuenta es en dólares" es más simple de razonar que
-- preguntar la moneda en cada gasto. El monto de cada movimiento ya
-- representa un valor en la moneda de SU cuenta — no hace falta tocar
-- `savings_movements` para nada de esto.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v20 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Moneda de la cuenta. DOP por defecto — ninguna cuenta existente
-- cambia de significado (RD$ es lo que ya asumían todos los cálculos).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.savings_accounts
  add column if not exists currency text not null default 'DOP'
    check (currency in ('DOP', 'USD', 'EUR'));


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — Tasas de cambio, editables por el usuario. Una fila por moneda
-- distinta de DOP que el usuario use — no una columna fija por moneda, así
-- agregar otra en el futuro no pide otra migración.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null check (currency in ('USD', 'EUR')),
  rate_to_dop numeric(12, 4) not null check (rate_to_dop > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, currency)
);

alter table public.exchange_rates enable row level security;

do $$
declare
  t text := 'exchange_rates';
begin
  execute format('drop policy if exists "own_select" on public.%I;', t);
  execute format('drop policy if exists "own_insert" on public.%I;', t);
  execute format('drop policy if exists "own_update" on public.%I;', t);
  execute format('drop policy if exists "own_delete" on public.%I;', t);
  execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
  execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
  execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id);', t);
  execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
end $$;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop table if exists public.exchange_rates;
-- alter table public.savings_accounts drop column if exists currency;
