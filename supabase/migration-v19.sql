-- =============================================================================
-- Migración v19 — Bloque 6: collect_receivable() / uncollect_receivable()
--
-- Mismo problema que resolvió pay_debt()/unpay_debt() (migration-v18), esta
-- vez en el flujo espejo: cobrar marca la cuota/registro como cobrado E
-- inserta el depósito en el ledger — dos escrituras sueltas desde
-- TypeScript hoy (toggleReceivableInstallment/toggleReceivableCollected en
-- app/(app)/cobros/actions.ts). Si la primera tiene éxito y la segunda
-- falla a medias, queda un cobro marcado "cobrado" sin que el dinero haya
-- entrado de verdad.
--
-- Más simple que pay_debt(): cobrar NO escribe en `expenses` (cobrar no es
-- gastar, es dinero que entra) — un solo insert al ledger, no dos.
--
-- security invoker: mismo criterio que pay_debt()/unpay_debt(),
-- v_account_balances y get_movement_stats — respeta RLS de quien llama.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v18 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 0 — DIAGNÓSTICO (solo lectura)
-- ─────────────────────────────────────────────────────────────────────────────
select 'cuotas de cobro cobradas hoy (para comparar antes/después)' as concepto,
       count(*) as filas
  from public.receivable_installments
 where paid = true and paid_date = current_date;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — collect_receivable(): marca cobrada la cuota (o el registro
-- completo, si es pago único) Y escribe el depósito, en una transacción.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.collect_receivable(
  p_receivable_id uuid,
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
  v_note text := 'Cobro recibido: ' || p_label;
  v_ref_id uuid := coalesce(p_installment_id, p_receivable_id);
begin
  if p_installment_id is not null then
    update public.receivable_installments
       set paid = true, paid_date = v_date
     where id = p_installment_id and user_id = v_user_id;
  else
    update public.receivables
       set status = 'cobrada'
     where id = p_receivable_id and user_id = v_user_id;
  end if;

  insert into public.savings_movements
    (account_id, user_id, kind, amount, date, note, source, source_ref_id)
  values
    (p_account_id, v_user_id, 'deposito', p_amount, v_date, v_note, 'receivable_collected', v_ref_id);
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — uncollect_receivable(): el reverso, mismo criterio que
-- unpay_debt() — no solo el camino de ida queda atómico.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.uncollect_receivable(
  p_receivable_id uuid,
  p_installment_id uuid
)
returns void
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_ref_id uuid := coalesce(p_installment_id, p_receivable_id);
begin
  if p_installment_id is not null then
    update public.receivable_installments
       set paid = false, paid_date = null
     where id = p_installment_id and user_id = v_user_id;
  else
    update public.receivables
       set status = 'pendiente'
     where id = p_receivable_id and user_id = v_user_id;
  end if;

  delete from public.savings_movements
   where source = 'receivable_collected' and source_ref_id = v_ref_id and user_id = v_user_id;
end;
$$;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop function if exists public.collect_receivable(uuid, uuid, numeric, uuid, text);
-- drop function if exists public.uncollect_receivable(uuid, uuid);
