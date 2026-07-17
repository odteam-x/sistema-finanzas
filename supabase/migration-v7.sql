-- =============================================================================
-- Migración v7: confirmar cobro antes de acreditarlo como disponible.
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- =============================================================================

-- Antes, el "Disponible esta quincena" se calculaba desde el sueldo
-- CONFIGURADO (salary_settings.default_amount), no desde el sueldo que
-- realmente llegó — así que el dinero aparecía disponible desde el día 1
-- de la quincena, antes de que el cobro pasara. Ahora cada fila de
-- `salaries` sabe si ya fue confirmada por el usuario; el disponible solo
-- suma las confirmadas (ver lib/summary.ts).
--
-- DEFAULT true dejar TODO el historial existente como ya confirmado (esas
-- quincenas ya se gastaron/usaron con esa información, no se tocan) — solo
-- los ingresos nuevos que genere runSalaryCatchUp() a partir de ahora
-- nacen sin confirmar.
alter table public.salaries
  add column if not exists confirmed boolean not null default true;

-- -----------------------------------------------------------------------------
-- Fix puntual de una sola vez (no repetir en instalaciones nuevas): la
-- quincena actual (16-31 jul 2026) ya se auto-acreditó sin que el usuario
-- confirmara que el pago realmente llegó. Se desconfirma y se retira su
-- movimiento espejo del ledger para que "Disponible" recalcule desde cero
-- y el usuario lo confirme con el nuevo flujo (banner en el Inicio).
-- -----------------------------------------------------------------------------
update public.salaries
  set confirmed = false
  where pay_date >= '2026-07-16' and pay_date <= '2026-07-31'
    and note = 'Ingreso automático';

delete from public.savings_movements
  where source = 'salary'
    and source_ref_id in (
      select id from public.salaries
      where pay_date >= '2026-07-16' and pay_date <= '2026-07-31'
        and note = 'Ingreso automático' and confirmed = false
    );
