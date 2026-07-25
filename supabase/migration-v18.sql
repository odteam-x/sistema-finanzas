-- =============================================================================
-- Migración v18 — Bloque 5: primera función RPC del proyecto (pay_debt / unpay_debt)
--
-- EL PROBLEMA:
-- Pagar una deuda toca 2-3 tablas (marca la cuota/deuda pagada, inserta el
-- retiro en el ledger, inserta el gasto espejo) con inserts/updates SUELTOS
-- desde TypeScript (ver toggleInstallment/toggleDebtPaid en
-- app/(app)/deudas/actions.ts). Si el primer paso tiene éxito y el segundo
-- falla a medias (red, RLS, lo que sea), queda un estado inconsistente: una
-- cuota marcada "pagada" sin que el dinero se haya movido de verdad, o un
-- movimiento del ledger sin su gasto espejo.
--
-- LA SOLUCIÓN: dos funciones que hacen la operación completa en una sola
-- transacción de Postgres — todo o nada. Es la primera vez que este
-- proyecto usa funciones de base de datos (antes solo vistas/triggers).
--
-- security invoker: la función corre con los permisos de quien la llama, no
-- los del dueño — respeta RLS igual que cualquier query normal (mismo
-- criterio que v_account_balances y get_movement_stats).
--
-- Resolver la cuenta (o crear la cuenta por defecto si no hay ninguna) se
-- queda en TypeScript (lib/accounts.ts) — es una responsabilidad distinta a
-- "mover el dinero atómicamente", y ya funciona bien ahí.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v17 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 0 — DIAGNÓSTICO (solo lectura)
-- ─────────────────────────────────────────────────────────────────────────────
select 'cuotas pagadas hoy (para comparar antes/después de usar la RPC)' as concepto,
       count(*) as filas
  from public.debt_installments
 where paid = true and paid_date = current_date;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — pay_debt(): marca pagada la cuota (o la deuda, si es pago único)
-- Y escribe el retiro + el gasto espejo, todo en una transacción.
--
-- p_installment_id null ⇒ pago único (marca debts.status = 'pagada').
-- p_installment_id no-null ⇒ deuda en cuotas (marca esa cuota; el trigger
-- trg_recompute_debt_status de migration-v10 recalcula debts.status solo,
-- dentro de la MISMA transacción — sigue siendo atómico).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.pay_debt(
  p_debt_id uuid,
  p_installment_id uuid,
  p_amount numeric,
  p_account_id uuid,
  p_label text
)
returns void
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_date date := current_date;
  v_note text := 'Pago deuda: ' || p_label;
  v_ref_id uuid := coalesce(p_installment_id, p_debt_id);
begin
  if p_installment_id is not null then
    update public.debt_installments
       set paid = true, paid_date = v_date
     where id = p_installment_id and user_id = v_user_id;
  else
    update public.debts
       set status = 'pagada'
     where id = p_debt_id and user_id = v_user_id;
  end if;

  insert into public.savings_movements
    (account_id, user_id, kind, amount, date, note, source, source_ref_id)
  values
    (p_account_id, v_user_id, 'retiro', p_amount, v_date, v_note, 'debt_payment', v_ref_id);

  insert into public.expenses
    (user_id, date, amount, note, account_id, source, source_ref_id)
  values
    (v_user_id, v_date, p_amount, v_note, p_account_id, 'debt_payment', v_ref_id);
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — unpay_debt(): el reverso. Mismo riesgo de estado a medias al
-- desmarcar un pago o reabrir una deuda (reopenDebt en actions.ts) — se
-- deja igual de atómico que el paso anterior, no solo el camino de ida.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.unpay_debt(
  p_debt_id uuid,
  p_installment_id uuid
)
returns void
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_ref_id uuid := coalesce(p_installment_id, p_debt_id);
begin
  if p_installment_id is not null then
    update public.debt_installments
       set paid = false, paid_date = null
     where id = p_installment_id and user_id = v_user_id;
  else
    update public.debts
       set status = 'pendiente'
     where id = p_debt_id and user_id = v_user_id;
  end if;

  delete from public.savings_movements
   where source = 'debt_payment' and source_ref_id = v_ref_id and user_id = v_user_id;

  delete from public.expenses
   where source = 'debt_payment' and source_ref_id = v_ref_id and user_id = v_user_id;
end;
$$;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop function if exists public.pay_debt(uuid, uuid, numeric, uuid, text);
-- drop function if exists public.unpay_debt(uuid, uuid);
