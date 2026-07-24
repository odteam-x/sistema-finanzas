-- =============================================================================
-- Migración v14 — FASE 7 (R14): vincular una deuda a una meta
--
-- Caso de uso: compraste un celular con dinero prestado. La deuda ya está
-- registrada; quieres que la meta "Celular" avance conforme la pagas.
--
-- El vínculo se guarda EN LA DEUDA (una deuda pertenece a una sola meta;
-- una meta puede tener varias deudas), igual que savings_accounts.goal_id.
-- ON DELETE SET NULL: borrar la meta no borra la deuda, solo la desvincula.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v13 aplicadas.
-- =============================================================================

alter table public.debts
  add column if not exists goal_id uuid references public.goals (id) on delete set null;

create index if not exists idx_debts_goal on public.debts (goal_id);


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop index if exists idx_debts_goal;
-- alter table public.debts drop column if exists goal_id;
