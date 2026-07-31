-- =============================================================================
-- Migración v28 — Frecuencia de cobro por días fijos del mes
--
-- 'quincenal' avanza sumando 15 días desde el ancla. Para quien cobra en días
-- FIJOS del mes (ej. 5 y 20) eso se desalinea solo: día 20 + 15 días cae en
-- el 4 del mes siguiente cada vez que el mes tiene 31, y de ahí en adelante
-- la fecha se va corriendo.
--
-- 'dias_fijos' avanza por calendario real usando pay_day_1/pay_day_2, que ya
-- existían desde el schema original y se habían dejado sin uso en
-- migration-v6 ("no todo el mundo cobra los días 15 y 30 fijos"). Cierto —
-- por eso el modo es opcional y NO reemplaza a 'quincenal', que se queda
-- igual para quien ya depende de él.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v27 aplicadas.
-- =============================================================================

alter table public.salary_settings drop constraint if exists salary_settings_frequency_check;
alter table public.salary_settings
  add constraint salary_settings_frequency_check
  check (frequency in ('semanal', 'quincenal', 'mensual', 'dias_fijos'));

comment on column public.salary_settings.pay_day_1 is
  'Primer día del mes de cobro. Solo se usa con frequency = dias_fijos.';
comment on column public.salary_settings.pay_day_2 is
  'Segundo día del mes de cobro. Solo se usa con frequency = dias_fijos.';

-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- update public.salary_settings set frequency = 'quincenal' where frequency = 'dias_fijos';
-- alter table public.salary_settings drop constraint if exists salary_settings_frequency_check;
-- alter table public.salary_settings
--   add constraint salary_settings_frequency_check
--   check (frequency in ('semanal', 'quincenal', 'mensual'));
