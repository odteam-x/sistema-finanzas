-- =============================================================================
-- Migración v20 — Bloque 7: perfiles de importación de estados de cuenta
--
-- Guarda el mapeo de columnas de un CSV bancario ("¿cuál columna es la
-- fecha? ¿cuál el monto?") por banco, para no volver a preguntarlo cada vez
-- que el usuario importa un extracto del mismo banco. Una sola tabla, sin
-- tocar el resto del schema: la importación en sí escribe en `expenses` +
-- `savings_movements` (gastos) o directo en `savings_movements` (ingresos
-- genéricos que no son sueldo) — las mismas tablas y el mismo patrón de
-- espejo que ya usa toda la app, no un silo nuevo.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v19 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Tabla de perfiles.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.import_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date_column text not null,
  description_column text not null,
  -- Un banco puede dar un solo monto con signo (amount_column) o dos
  -- columnas separadas (débito/crédito) — se guardan las tres, las que no
  -- apliquen quedan null.
  amount_column text,
  debit_column text,
  credit_column text,
  date_format text not null default 'YYYY-MM-DD',
  decimal_separator text not null default '.',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_import_profiles_user on public.import_profiles (user_id);

alter table public.import_profiles enable row level security;

do $$
declare
  t text := 'import_profiles';
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
-- drop table if exists public.import_profiles;
