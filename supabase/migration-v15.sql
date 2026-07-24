-- =============================================================================
-- Migración v15 — FASE 8 (R15): borrado suave + deshacer
--
-- Nada se borra de verdad al eliminar: se marca `deleted_at` y desaparece de
-- las lecturas. Eso hace posible el "Deshacer" del toast (poner deleted_at
-- de vuelta en NULL) sin tener que reconstruir la fila ni sus efectos.
--
-- Se aplica a las 12 tablas de datos del usuario. Quedan fuera a propósito:
--   - user_profile y salary_settings: son configuración de una sola fila por
--     usuario, no se "eliminan" desde ningún lado de la app.
--   - debt_installments y receivable_installments: no se borran sueltas,
--     viven y mueren con su deuda/cobro (ON DELETE CASCADE).
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v14 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Columna deleted_at + índice parcial en cada tabla.
-- El índice parcial (WHERE deleted_at IS NULL) es el que importa: casi todas
-- las consultas piden solo las filas vivas.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'salaries', 'expenses', 'savings_accounts', 'savings_movements',
    'debts', 'debt_increments', 'receivables',
    'goals', 'budget_categories', 'subscriptions', 'tags',
    'work_calendar_exceptions'
  ];
begin
  foreach t in array tables loop
    execute format(
      'alter table public.%I add column if not exists deleted_at timestamptz;', t);
    execute format(
      'create index if not exists idx_%s_alive on public.%I (user_id) where deleted_at is null;',
      t, t);
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — Purga diferida: limpiar de verdad lo que lleve más de 30 días
-- en la papelera. Se ejecuta a mano (o con un cron de Supabase si algún día
-- se quiere automatizar); no corre sola.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.purge_deleted(p_days int default 30)
returns void
language plpgsql
security invoker
as $$
declare
  t text;
  tables text[] := array[
    'savings_movements', 'expenses', 'salaries', 'debt_increments',
    'debts', 'receivables', 'savings_accounts',
    'goals', 'budget_categories', 'subscriptions', 'tags',
    'work_calendar_exceptions'
  ];
begin
  -- El orden importa: primero las tablas que dependen de otras, para no
  -- chocar con las claves foráneas RESTRICT de migration-v9.
  foreach t in array tables loop
    execute format(
      'delete from public.%I where deleted_at is not null and deleted_at < now() - ($1 || '' days'')::interval;',
      t) using p_days;
  end loop;
end;
$$;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop function if exists public.purge_deleted(int);
-- do $$
-- declare
--   t text;
--   tables text[] := array[
--     'salaries','expenses','savings_accounts','savings_movements',
--     'debts','debt_increments','receivables',
--     'goals','budget_categories','subscriptions','tags',
--     'work_calendar_exceptions'
--   ];
-- begin
--   foreach t in array tables loop
--     execute format('drop index if exists idx_%s_alive;', t);
--     execute format('alter table public.%I drop column if exists deleted_at;', t);
--   end loop;
-- end $$;
