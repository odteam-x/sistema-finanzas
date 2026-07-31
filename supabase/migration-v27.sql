-- =============================================================================
-- Migración v27 — Acreedores como entidad propia
--
-- Hasta ahora el acreedor ERA `debts.name`: texto libre repetido en cada
-- deuda. "Banco BHD" y "banco bhd" se veían como dos acreedores distintos, y
-- corregir el nombre en una deuda no arrastraba a las demás.
--
-- `debts.name` NO se borra: pasa a ser la descripción opcional de ESA deuda
-- concreta ("Préstamo del carro"). Sigue siendo NOT NULL y lo siguen leyendo
-- las notas del ledger, el calendario y las alertas, así que nada de lo ya
-- escrito se pierde ni cambia de significado hacia atrás.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v26 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Tabla `creditors` + RLS
-- `deleted_at` se crea acá y no vía migration-v15: esa migración corre antes
-- que esta en una instalación limpia, cuando la tabla todavía no existe.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.creditors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  note       text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Un acreedor por nombre normalizado: es justo lo que impide que "Banco BHD"
-- y "banco bhd " vuelvan a convivir como dos entidades. Se normaliza para
-- COMPARAR; el texto que se guarda es el que escribió el usuario.
create unique index if not exists creditors_user_name_key
  on public.creditors (user_id, lower(btrim(name)))
  where deleted_at is null;

create index if not exists idx_creditors_alive
  on public.creditors (user_id) where deleted_at is null;

alter table public.creditors enable row level security;

do $$
declare
  t text := 'creditors';
begin
  execute format('drop policy if exists "own_select" on public.%I;', t);
  execute format('drop policy if exists "own_insert" on public.%I;', t);
  execute format('drop policy if exists "own_update" on public.%I;', t);
  execute format('drop policy if exists "own_delete" on public.%I;', t);
  execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
  execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
  execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — Columna en `debts`
-- ON DELETE RESTRICT, no CASCADE: borrar un acreedor no puede llevarse por
-- delante el historial de lo que le debiste.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.debts
  add column if not exists creditor_id uuid references public.creditors (id) on delete restrict;

create index if not exists idx_debts_creditor on public.debts (creditor_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3 — Backfill
-- Un acreedor por nombre normalizado (trim + lower), conservando el texto
-- ORIGINAL de la primera deuda que lo usó. Sin fusiones agresivas: acentos,
-- abreviaturas y variantes de escritura NO se tocan — inventar equivalencias
-- fusionaría acreedores que el usuario considera distintos.
-- Incluye las deudas con deleted_at: si se restauran desde la papelera, su
-- acreedor tiene que seguir existiendo.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.creditors (user_id, name)
select distinct on (d.user_id, lower(btrim(d.name)))
       d.user_id, btrim(d.name)
from public.debts d
where d.creditor_id is null
  and coalesce(btrim(d.name), '') <> ''
order by d.user_id, lower(btrim(d.name)), d.created_at, d.id
on conflict do nothing;

update public.debts d
set creditor_id = c.id
from public.creditors c
where d.creditor_id is null
  and c.user_id = d.user_id
  and c.deleted_at is null
  and lower(btrim(c.name)) = lower(btrim(d.name));


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 4 — `creditors` entra a la purga diferida (R15).
-- Reemplaza la lista de tablas de migration-v15: `create or replace` es lo
-- único que cambia una función YA creada, editar el archivo viejo no.
-- `creditors` va DESPUÉS de `debts`: la FK es RESTRICT y purgar al acreedor
-- primero chocaría con las deudas que todavía lo apuntan.
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
    'debts', 'creditors', 'receivables', 'savings_accounts',
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
-- alter table public.debts drop column if exists creditor_id;
-- drop table if exists public.creditors;
-- (purge_deleted vuelve a su lista de 12 recorriendo el PASO 2 de migration-v15.)
