-- =============================================================================
-- Migración v6: frecuencia de cobro personalizable + acreditación automática.
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- 100% aditivo: pay_day_1/pay_day_2 se dejan en la tabla (sin usarse en la
-- app) en vez de borrarlos, para no perder datos existentes.
-- =============================================================================

-- Frecuencia real de cobro (no todo el mundo cobra los días 15 y 30 fijos —
-- "quincenal" es cada 15 días desde la fecha que el usuario indique).
alter table public.salary_settings
  add column if not exists frequency text not null default 'quincenal'
    check (frequency in ('semanal', 'quincenal', 'mensual'));

-- Próxima fecha de cobro (ancla): se avanza sola cada vez que se cumple,
-- igual que next_charge_date en suscripciones.
alter table public.salary_settings
  add column if not exists next_pay_date date;

-- Método de cobro por defecto: a qué cuenta acreditar el ingreso que se
-- genera solo cuando llega next_pay_date (no hay formulario en ese momento
-- para preguntar "¿cómo cobraste?").
alter table public.salary_settings
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('efectivo', 'banco', 'tarjeta_debito', 'tarjeta_credito'));
