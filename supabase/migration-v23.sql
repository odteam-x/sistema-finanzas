-- =============================================================================
-- Migración v23 — Bloque 10b: cuenta colchón (ingresos variables)
--
-- Para quien cobra freelance/informal (monto variable, no quincena fija): el
-- ingreso real entra a una cuenta "colchón" como cualquier depósito, y un
-- botón de un toque ("Pagarme esta quincena") transfiere un monto FIJO
-- configurado hacia la cuenta operativa que el usuario usa para gastar.
-- Reusa MovementKind 'transferencia' (ya existe) — no requiere una tabla ni
-- un tipo de movimiento nuevo, solo marcar qué cuenta es el colchón y a
-- dónde/cuánto se paga.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v22 aplicadas.
-- =============================================================================

alter table public.savings_accounts
  add column if not exists is_cushion boolean not null default false,
  add column if not exists cushion_payout_amount numeric(12, 2) null
    check (cushion_payout_amount is null or cushion_payout_amount > 0),
  add column if not exists cushion_target_account_id uuid null
    references public.savings_accounts(id) on delete set null;

-- Solo puede haber una cuenta colchón por usuario a la vez — mismo criterio
-- que is_default (que no tiene índice único porque su exclusividad la
-- garantiza el código, ver lib/accounts.ts; acá sí conviene un índice porque
-- "Pagarme esta quincena" necesita encontrarla sin ambigüedad).
create unique index if not exists savings_accounts_one_cushion_per_user
  on public.savings_accounts (user_id)
  where is_cushion;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop index if exists public.savings_accounts_one_cushion_per_user;
-- alter table public.savings_accounts
--   drop column if exists is_cushion,
--   drop column if exists cushion_payout_amount,
--   drop column if exists cushion_target_account_id;
