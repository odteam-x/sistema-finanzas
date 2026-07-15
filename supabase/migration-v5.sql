-- =============================================================================
-- Migración v5: ledger autoritativo (FASE 2, mitad ledger).
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- 100% aditivo y reversible: solo agrega columnas nuevas, no borra ni cambia
-- datos existentes. No fusiona taxonomías (eso va en una migración aparte).
-- =============================================================================

-- Origen de cada movimiento del ledger y a qué fila lo generó (gasto, sueldo,
-- suscripción, pago de deuda, aporte a meta). Permite: (a) limpiar el
-- movimiento espejo al borrar su fila origen, (b) que Balance/Patrimonio se
-- deriven del ledger sin ambigüedad. 'manual' = movimiento hecho a mano.
alter table public.savings_movements
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'salary', 'subscription', 'debt_payment', 'goal_contribution'));
alter table public.savings_movements
  add column if not exists source_ref_id uuid;

-- Cuenta por defecto: a dónde entran/salen los movimientos cuando el usuario
-- no elige cuenta explícita (así registrar un gasto no obliga a elegir cuenta).
alter table public.savings_accounts
  add column if not exists is_default boolean not null default false;

create index if not exists idx_savings_movements_source
  on public.savings_movements (user_id, source, source_ref_id);
create index if not exists idx_savings_accounts_default
  on public.savings_accounts (user_id, is_default);
