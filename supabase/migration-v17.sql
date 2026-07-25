-- =============================================================================
-- Migración v17 — arregla v_account_balances para respetar el borrado suave
--
-- EL PROBLEMA:
-- La vista v_account_balances se creó en migration-v9 como la fuente única
-- de cálculo del balance por cuenta (regla 1-bis). Pero R15 (migration-v15,
-- borrado suave) llegó DESPUÉS y nunca se volvió a tocar esta vista: sigue
-- sumando TODOS los movimientos, incluidos los marcados como eliminados
-- (deleted_at IS NOT NULL) — un movimiento que el usuario borró (y que ya no
-- aparece en ningún lado de la app) seguiría inflando el balance si algo
-- llegara a leer de esta vista.
--
-- Por eso la app hoy NO lee de esta vista (sigue sumando en JS sobre las
-- filas ya filtradas por `.is("deleted_at", null)`) — este arreglo es el
-- paso previo necesario para poder usarla de verdad y así evitar traer el
-- historial completo de movimientos solo para sumar un balance.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v16 aplicadas.
-- =============================================================================

create or replace view public.v_account_balances
with (security_invoker = on) as
  select account_id, user_id, sum(delta) as balance
    from (
      -- Lado que afecta a la cuenta de origen
      select account_id,
             user_id,
             case kind
               when 'deposito'      then amount
               when 'retiro'        then -amount
               when 'transferencia' then -amount
             end as delta
        from public.savings_movements
       where deleted_at is null
      union all
      -- Lado que entra a la cuenta destino (solo transferencias)
      select to_account_id as account_id,
             user_id,
             amount as delta
        from public.savings_movements
       where kind = 'transferencia' and to_account_id is not null
         and deleted_at is null
    ) t
   group by account_id, user_id;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- Vuelve a la versión de migration-v9 (sin filtro de deleted_at).
-- create or replace view public.v_account_balances
-- with (security_invoker = on) as
--   select account_id, user_id, sum(delta) as balance
--     from (
--       select account_id, user_id,
--              case kind
--                when 'deposito' then amount
--                when 'retiro' then -amount
--                when 'transferencia' then -amount
--              end as delta
--         from public.savings_movements
--       union all
--       select to_account_id as account_id, user_id, amount as delta
--         from public.savings_movements
--        where kind = 'transferencia' and to_account_id is not null
--     ) t
--    group by account_id, user_id;
