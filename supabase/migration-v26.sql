-- =============================================================================
-- Migración v26 — Desembolso de préstamos que el usuario DA (Cobros)
--
-- Simétrico a migration-v16 (debt_disbursement, deudas que RECIBES). Cuando
-- kind='prestamo' en `receivables` (le prestaste dinero a alguien), ese
-- dinero SALE de una cuenta real hoy sin pasar por el ledger — el balance
-- de cuentas y el préstamo se contaban como si fueran independientes.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v25 aplicadas.
-- =============================================================================

alter table public.savings_movements drop constraint if exists savings_movements_source_check;
alter table public.savings_movements
  add constraint savings_movements_source_check
  check (source in ('manual', 'salary', 'subscription', 'debt_payment',
                    'goal_contribution', 'receivable_collected',
                    'debt_disbursement', 'receivable_disbursement'));

-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- alter table public.savings_movements drop constraint if exists savings_movements_source_check;
-- alter table public.savings_movements
--   add constraint savings_movements_source_check
--   check (source in ('manual', 'salary', 'subscription', 'debt_payment',
--                     'goal_contribution', 'receivable_collected',
--                     'debt_disbursement'));
