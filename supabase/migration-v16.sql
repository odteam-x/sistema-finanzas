-- =============================================================================
-- Migración v16 — Tipo de deuda: ¿el dinero entró a tu bolsillo o no?
--
-- EL PROBLEMA QUE ARREGLA (doble conteo):
--   Tomas RD$200 prestados → gastas esos RD$200 → pagas la deuda de RD$200.
--   Hoy quedaban RD$400 en gastos y −RD$400 de balance, cuando en realidad
--   solo te empobreciste RD$200 (lo que pagaste de tu bolsillo).
--
--   La causa: registrar la deuda modelaba el COMPROMISO ("debo 200") pero no
--   el DESEMBOLSO ("me dieron 200 en la mano"). Como esos 200 nunca entraban
--   a ninguna cuenta, el gasto que hiciste con ellos parecía salir de tu
--   propio dinero — y luego el pago volvía a salir.
--
-- LA SOLUCIÓN: dos tipos de deuda.
--   'prestamo' → te dieron el dinero. Entra un depósito a la cuenta elegida.
--   'credito'  → compraste a crédito / te fiaron. El proveedor pagó directo,
--                nunca tocaste ese dinero, así que no entra nada (es el
--                comportamiento que ya existía y para este caso es correcto).
--
-- Las deudas YA registradas quedan como 'credito' a propósito: marcarlas como
-- 'prestamo' inventaría ingresos retroactivos que descuadrarían tu balance
-- actual. Si alguna sí fue plata que recibiste, ajústala a mano.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v15 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 0 — DIAGNÓSTICO (solo lectura)
-- ─────────────────────────────────────────────────────────────────────────────
select 'deudas existentes (quedarán como crédito)' as concepto, count(*) as filas
  from public.debts where deleted_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Tipo de deuda. Default 'credito' = no entra dinero, que es
-- exactamente lo que hacía la app antes de esta migración.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.debts
  add column if not exists kind text not null default 'credito'
    check (kind in ('prestamo', 'credito'));

comment on column public.debts.kind is
  'prestamo = recibiste el dinero (entra a una cuenta) · credito = compraste a crédito, nunca tocaste el dinero';


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — Nuevo origen en el ledger: el desembolso del préstamo.
-- Es dinero que ENTRA (depósito), distinto de 'debt_payment' que es el que
-- sale al pagar.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.savings_movements drop constraint if exists savings_movements_source_check;
alter table public.savings_movements
  add constraint savings_movements_source_check
  check (source in ('manual', 'salary', 'subscription', 'debt_payment',
                    'goal_contribution', 'receivable_collected',
                    'debt_disbursement'));


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- alter table public.debts drop column if exists kind;
-- alter table public.savings_movements drop constraint if exists savings_movements_source_check;
-- alter table public.savings_movements
--   add constraint savings_movements_source_check
--   check (source in ('manual','salary','subscription','debt_payment',
--                     'goal_contribution','receivable_collected'));
