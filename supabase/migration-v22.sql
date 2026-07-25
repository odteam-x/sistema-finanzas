-- =============================================================================
-- Migración v22 — Bloque 8c: auto-categorización por reglas simples
--
-- Reglas de texto (no ML): "si la nota contiene X → categoría Y". Se aplican
-- al registrar un gasto sin categoría explícita (ver addExpense en
-- app/(app)/presupuesto/actions.ts) y se ofrecen como sugerencia editable en
-- el formulario. Se guardan por separado de `tags` (no una columna en tags)
-- porque una etiqueta puede tener 0, 1 o varias palabras clave asociadas.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v21 aplicadas.
-- =============================================================================

create table if not exists public.categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Ya normalizada (minúsculas, sin acentos) al guardar — así la comparación
  -- al registrar un gasto es una simple búsqueda de substring, sin volver a
  -- normalizar en cada consulta.
  keyword text not null,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);

alter table public.categorization_rules enable row level security;

do $$
declare
  t text := 'categorization_rules';
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
-- drop table if exists public.categorization_rules;
