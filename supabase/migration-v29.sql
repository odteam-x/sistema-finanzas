-- =============================================================================
-- Migración v29 — Una sola etiqueta viva por nombre y por usuario
--
-- `seedDefaultTagsIfEmpty()` (lib/tags.ts) contaba las etiquetas del usuario y,
-- si no había ninguna, insertaba las 7 por defecto. Contar e insertar son dos
-- viajes distintos a la base, sin transacción que los una, y la función se
-- llama al inicio de DOS Server Components (presupuesto/page.tsx y
-- configuracion/page.tsx). Dos cargas a la vez ⇒ las dos cuentan 0 ⇒ las dos
-- insertan ⇒ 14 categorías, siete de ellas repetidas. El índice existente
-- idx_tags_user (user_id, name) no lo impedía: no es único.
--
-- Se cierran las dos mitades:
--   1. La decisión de sembrar y la inserción pasan a la MISMA transacción, con
--      un lock por usuario (función seed_default_tags).
--   2. Un índice único hace el duplicado imposible venga de donde venga —
--      también de "Agregar etiqueta" a mano, que hoy acepta dos "Salud".
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v28 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Fusionar duplicados vivos, si los hubiera.
-- Al aplicarse no había ninguno (consultado en la base), así que estas
-- sentencias no tocan nada. Están para que la migración no reviente a medias en
-- una base que sí los tenga: sin esto, el índice del PASO 2 falla.
-- Sobrevive la más antigua de cada nombre; lo que apuntaba a las repetidas se
-- REPUNTA a ella ANTES de darlas de baja, para que ningún gasto ya
-- categorizado se quede sin categoría por una limpieza.
-- ─────────────────────────────────────────────────────────────────────────────
update public.expenses e set tag_id = k.keep_id
from (
  select id, first_value(id) over (
    partition by user_id, lower(btrim(name)) order by created_at, id
  ) as keep_id
  from public.tags where deleted_at is null
) k
where e.tag_id = k.id and k.keep_id <> k.id;

update public.salaries s set tag_id = k.keep_id
from (
  select id, first_value(id) over (
    partition by user_id, lower(btrim(name)) order by created_at, id
  ) as keep_id
  from public.tags where deleted_at is null
) k
where s.tag_id = k.id and k.keep_id <> k.id;

update public.subscriptions su set tag_id = k.keep_id
from (
  select id, first_value(id) over (
    partition by user_id, lower(btrim(name)) order by created_at, id
  ) as keep_id
  from public.tags where deleted_at is null
) k
where su.tag_id = k.id and k.keep_id <> k.id;

-- categorization_rules.tag_id es NOT NULL con on delete cascade (v22): si la
-- etiqueta repetida se fuera sin repuntar, la regla se perdería entera.
update public.categorization_rules cr set tag_id = k.keep_id
from (
  select id, first_value(id) over (
    partition by user_id, lower(btrim(name)) order by created_at, id
  ) as keep_id
  from public.tags where deleted_at is null
) k
where cr.tag_id = k.id and k.keep_id <> k.id;

-- Baja suave, no delete: si la fusión estuvo mal, la fila sigue ahí.
update public.tags t set deleted_at = now()
from (
  select id, first_value(id) over (
    partition by user_id, lower(btrim(name)) order by created_at, id
  ) as keep_id
  from public.tags where deleted_at is null
) k
where t.id = k.id and k.keep_id <> k.id;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — El invariante.
-- · Normalizado con lower(btrim(...)): para el usuario "Salud", "salud" y
--   "Salud " son la misma categoría. Si la base las deja convivir, sus gastos
--   se reparten entre tres barras distintas en Gastos y ninguna cuadra.
-- · Parcial (where deleted_at is null): el borrado es suave (v15). Sin el
--   predicado, borrar "Salud" y volver a crearla chocaría contra una fila
--   invisible para el usuario — un error que no habría forma de entender.
-- · Por user_id: dos usuarios pueden tener cada uno su "Colmado" sin estorbarse.
-- ─────────────────────────────────────────────────────────────────────────────
create unique index if not exists uniq_tags_user_name_alive
  on public.tags (user_id, lower(btrim(name)))
  where deleted_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3 — Siembra atómica.
-- Los nombres llegan como parámetro desde la app: lib/tags.ts sigue siendo la
-- ÚNICA lista de categorías por defecto, para que cambiarla no exija otra
-- migración.
--
-- pg_advisory_xact_lock serializa las cargas simultáneas del MISMO usuario: la
-- segunda espera a que la primera cierre su transacción y entonces ya ve sus
-- filas, así que su `not exists` es falso y no inserta nada. El lock se suelta
-- solo al terminar la transacción — no hay que liberarlo ni se queda pegado si
-- algo falla a mitad.
--
-- El `not exists` mira la tabla COMPLETA, sin filtrar deleted_at, a propósito:
-- es exactamente la intención del código que reemplaza — a quien borró todas
-- sus categorías no se le vuelven a sembrar.
--
-- security invoker + RLS: la función solo puede escribir lo que el propio
-- usuario podría escribir desde la app. No hay escalada de privilegios.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.seed_default_tags(p_names text[])
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_inserted integer := 0;
begin
  if v_user is null or array_length(p_names, 1) is null then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext('seed_default_tags:' || v_user::text));

  -- El distinct on protege contra una lista con dos nombres que normalizan
  -- igual: chocarían contra el índice del PASO 2 dentro de la misma sentencia.
  insert into public.tags (user_id, name, color)
  select distinct on (lower(btrim(t.tag_name)))
    v_user, btrim(t.tag_name), 'primary'
  from unnest(p_names) as t(tag_name)
  where btrim(t.tag_name) <> ''
    and not exists (select 1 from public.tags where user_id = v_user)
  order by lower(btrim(t.tag_name));

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.seed_default_tags(text[]) to authenticated;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop function if exists public.seed_default_tags(text[]);
-- drop index if exists public.uniq_tags_user_name_alive;
