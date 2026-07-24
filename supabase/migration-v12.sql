-- =============================================================================
-- Migración v12 — FASE 5 (R06): agregados de Movimientos calculados en la BASE
--
-- Antes los totales se calculaban en JS con .reduce() sobre TODAS las filas
-- ya traídas al servidor. Con historial grande eso significa traer miles de
-- filas solo para sumarlas. Esta función devuelve los números ya sumados,
-- respetando los mismos filtros que la lista.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9, v10 y v11 aplicadas.
-- =============================================================================

-- Devuelve, para el usuario autenticado y los filtros dados:
--   total_ingresos / total_egresos / neto  (las transferencias NO cuentan:
--     el dinero no entró ni salió del sistema, solo cambió de cuenta)
--   cantidad de movimientos
--   día con más movimientos del rango + cuántos y su neto
create or replace function public.get_movement_stats(
  p_from   date default null,
  p_to     date default null,
  p_kind   text default null,   -- 'deposito' | 'retiro' | null (todos)
  p_search text default null
)
returns table (
  total_ingresos numeric,
  total_egresos  numeric,
  neto           numeric,
  cantidad       bigint,
  busiest_date   date,
  busiest_count  bigint,
  busiest_neto   numeric
)
language sql
security invoker
stable
as $$
  with filtrado as (
    select m.*
      from public.savings_movements m
      left join public.savings_accounts a on a.id = m.account_id
     where m.user_id = auth.uid()
       and (p_from is null or m.date >= p_from)
       and (p_to   is null or m.date <= p_to)
       and (p_kind is null or m.kind = p_kind)
       and (
         p_search is null or p_search = ''
         or m.note ilike '%' || p_search || '%'
         or a.name ilike '%' || p_search || '%'
       )
  ),
  totales as (
    select
      coalesce(sum(amount) filter (where kind = 'deposito'), 0) as ingresos,
      coalesce(sum(amount) filter (where kind = 'retiro'),   0) as egresos,
      count(*)                                                  as n
    from filtrado
  ),
  por_dia as (
    select date,
           count(*) as cuenta,
           coalesce(sum(case when kind = 'deposito' then amount
                             when kind = 'retiro'   then -amount
                             else 0 end), 0) as neto_dia
      from filtrado
     group by date
     order by count(*) desc, date desc
     limit 1
  )
  select
    t.ingresos,
    t.egresos,
    t.ingresos - t.egresos,
    t.n,
    d.date,
    d.cuenta,
    d.neto_dia
  from totales t
  left join por_dia d on true;
$$;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop function if exists public.get_movement_stats(date, date, text, text);
