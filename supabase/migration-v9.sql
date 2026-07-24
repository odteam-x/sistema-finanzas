-- =============================================================================
-- Migración v9 — FASE 1: núcleo del ledger
--   R08: ningún gasto/ingreso puede quedar sin cuenta.
--   R09: transferencias reales entre cuentas propias.
--   1-bis: una sola fuente de cálculo del balance (vista v_account_balances).
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
--
-- ⚠️ PASO 0 OBLIGATORIO: corre primero el bloque de DIAGNÓSTICO de abajo y
--    revisa los conteos ANTES de ejecutar el resto. Si algún número te
--    sorprende, para y avísame — no sigas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 0 — DIAGNÓSTICO (solo lectura, no modifica nada). Corre SOLO esto
-- primero y mira los resultados.
-- ─────────────────────────────────────────────────────────────────────────────
select 'gastos sin cuenta' as concepto, count(*) as filas_afectadas
  from public.expenses where account_id is null
union all
select 'ingresos sin cuenta', count(*)
  from public.salaries where account_id is null
union all
select 'cuentas existentes', count(*)
  from public.savings_accounts
union all
select 'cuentas marcadas por defecto', count(*)
  from public.savings_accounts where is_default = true;

-- Si "cuentas marcadas por defecto" es 0 pero "cuentas existentes" es > 0,
-- el PASO 1 marcará la más antigua como default (no crea una nueva).


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Garantizar que cada usuario tenga una cuenta por defecto (Efectivo).
-- Idempotente: no crea nada si ya hay una marcada.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Si el usuario tiene cuentas pero ninguna marcada default, marca la más antigua.
update public.savings_accounts sa
   set is_default = true
 where sa.is_default = false
   and not exists (
     select 1 from public.savings_accounts x
      where x.user_id = sa.user_id and x.is_default = true
   )
   and sa.created_at = (
     select min(y.created_at) from public.savings_accounts y where y.user_id = sa.user_id
   );

-- 1b. Si el usuario no tiene ninguna cuenta, crear "Efectivo" por defecto.
insert into public.savings_accounts (user_id, name, type, is_default)
select distinct u.user_id, 'Efectivo', 'efectivo', true
  from (
    select user_id from public.expenses
    union select user_id from public.salaries
    union select user_id from public.savings_movements
  ) u
 where not exists (
   select 1 from public.savings_accounts sa where sa.user_id = u.user_id
 );


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — Backfill: asignar la cuenta por defecto a los gastos/ingresos
-- que quedaron sin cuenta (el conteo lo viste en el PASO 0).
-- ─────────────────────────────────────────────────────────────────────────────
update public.expenses e
   set account_id = (
     select sa.id from public.savings_accounts sa
      where sa.user_id = e.user_id and sa.is_default = true
      limit 1
   )
 where e.account_id is null;

update public.salaries s
   set account_id = (
     select sa.id from public.savings_accounts sa
      where sa.user_id = s.user_id and sa.is_default = true
      limit 1
   )
 where s.account_id is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3 — R08: prohibir account_id nulo de aquí en adelante.
--
-- El FK actual es ON DELETE SET NULL, que es INCOMPATIBLE con NOT NULL
-- (borrar una cuenta intentaría escribir null en una columna que ya no lo
-- permite y fallaría). Se cambia a RESTRICT: la base impide borrar una
-- cuenta que todavía tenga gastos/ingresos colgando. La app reasigna esas
-- filas a la cuenta por defecto ANTES de borrar (ver deleteAccount en
-- app/(app)/balance/actions.ts) — así no se pierde historial de gastos por
-- borrar una cuenta, que es lo que pasaría con CASCADE.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.expenses drop constraint if exists expenses_account_id_fkey;
alter table public.expenses
  add constraint expenses_account_id_fkey
  foreign key (account_id) references public.savings_accounts (id) on delete restrict;

alter table public.salaries drop constraint if exists salaries_account_id_fkey;
alter table public.salaries
  add constraint salaries_account_id_fkey
  foreign key (account_id) references public.savings_accounts (id) on delete restrict;

alter table public.expenses alter column account_id set not null;
alter table public.salaries  alter column account_id set not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 4 — R09: transferencias entre cuentas propias.
-- UNA sola fila representa toda la transferencia: sale de `account_id`,
-- entra a `to_account_id`. No infla ingresos ni egresos totales porque no
-- es ni 'deposito' ni 'retiro'.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.savings_movements
  add column if not exists to_account_id uuid references public.savings_accounts (id) on delete restrict;

alter table public.savings_movements drop constraint if exists savings_movements_kind_check;
alter table public.savings_movements
  add constraint savings_movements_kind_check
  check (kind in ('deposito', 'retiro', 'transferencia'));

-- Una transferencia SIEMPRE necesita destino, y ese destino no puede ser la
-- misma cuenta de origen. Los demás tipos nunca llevan destino.
alter table public.savings_movements drop constraint if exists savings_movements_transfer_check;
alter table public.savings_movements
  add constraint savings_movements_transfer_check
  check (
    (kind = 'transferencia' and to_account_id is not null and to_account_id <> account_id)
    or
    (kind <> 'transferencia' and to_account_id is null)
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 5 — 1-bis: UNA sola fuente de verdad para el balance de una cuenta.
-- Hoy esta misma resta está escrita a mano en 3 archivos distintos
-- (lib/summary.ts, balance/page.tsx, metas/page.tsx) — con esta vista, los
-- tres pasan a leer de acá y ya no pueden desincronizarse.
--
-- security_invoker = on ⇒ la vista respeta las políticas RLS de quien
-- consulta (sin esto, una vista corre con los permisos de su dueño y se
-- saltaría RLS).
--
-- La transferencia produce DOS efectos desde UNA fila: resta en la cuenta
-- origen y suma en la cuenta destino (el union all de abajo).
-- ─────────────────────────────────────────────────────────────────────────────
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
      union all
      -- Lado que entra a la cuenta destino (solo transferencias)
      select to_account_id as account_id,
             user_id,
             amount as delta
        from public.savings_movements
       where kind = 'transferencia' and to_account_id is not null
    ) t
   group by account_id, user_id;


-- =============================================================================
-- REVERSIÓN (-- down) — por si algo sale mal. Ejecutar en orden inverso.
-- Ojo: revertir el PASO 2 no es posible (no se guarda cuáles filas estaban
-- en null); el resto sí.
-- =============================================================================
-- drop view if exists public.v_account_balances;
--
-- alter table public.savings_movements drop constraint if exists savings_movements_transfer_check;
-- alter table public.savings_movements drop constraint if exists savings_movements_kind_check;
-- alter table public.savings_movements
--   add constraint savings_movements_kind_check check (kind in ('deposito', 'retiro'));
-- alter table public.savings_movements drop column if exists to_account_id;
--
-- alter table public.expenses alter column account_id drop not null;
-- alter table public.salaries  alter column account_id drop not null;
-- alter table public.expenses drop constraint if exists expenses_account_id_fkey;
-- alter table public.expenses
--   add constraint expenses_account_id_fkey
--   foreign key (account_id) references public.savings_accounts (id) on delete set null;
-- alter table public.salaries drop constraint if exists salaries_account_id_fkey;
-- alter table public.salaries
--   add constraint salaries_account_id_fkey
--   foreign key (account_id) references public.savings_accounts (id) on delete set null;
