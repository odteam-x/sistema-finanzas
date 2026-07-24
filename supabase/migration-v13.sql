-- =============================================================================
-- Migración v13 — FASE 6 (R13): base de cálculo del presupuesto configurable
--
-- Hoy `budget_period_overrides` solo guarda un NÚMERO de días (un override
-- del resultado del conteo automático). R13 pide dos modos mutuamente
-- excluyentes:
--   Modo A — días trabajados (calendario laboral, comportamiento actual)
--   Modo B — días personalizados: el usuario elige las fechas exactas
--            en un calendario multi-selección.
--
-- Se extiende la tabla existente en vez de crear una nueva: sigue siendo
-- "cómo se cuentan los días de ESTA quincena", solo que ahora con modo.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v12 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 0 — DIAGNÓSTICO (solo lectura)
-- ─────────────────────────────────────────────────────────────────────────────
select 'periodos con override manual' as concepto, count(*) as filas
  from public.budget_period_overrides;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Modo de cálculo + días elegidos a mano.
-- 'trabajados' = Modo A (default, lo que ya hacía: `workdays` como número).
-- 'personalizado' = Modo B: manda `custom_days`, un arreglo de fechas.
-- Las filas que ya existen quedan en 'trabajados' — cero cambio de
-- comportamiento para lo ya configurado.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.budget_period_overrides
  add column if not exists mode text not null default 'trabajados'
    check (mode in ('trabajados', 'personalizado'));

alter table public.budget_period_overrides
  add column if not exists custom_days date[] not null default '{}';

-- En modo personalizado, la cantidad de días es la del arreglo — `workdays`
-- deja de mandar (se conserva para no romper filas viejas ni el Modo A).
comment on column public.budget_period_overrides.custom_days is
  'Modo B: fechas exactas elegidas por el usuario. En modo A se ignora.';


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- alter table public.budget_period_overrides drop column if exists custom_days;
-- alter table public.budget_period_overrides drop column if exists mode;
