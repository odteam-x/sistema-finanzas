-- =============================================================================
-- Migración v8: pagos de deuda pasan a contar como gasto + cuenta de origen.
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- =============================================================================

-- Igual que en savings_movements: permite saber si una fila de `expenses`
-- vino de un pago de deuda (para poder limpiarla si se desmarca/borra la
-- deuda) en vez de haberse registrado a mano. Sin esto, pagar una deuda
-- no aparecía en "Gastos reales de la quincena" ni en el presupuesto,
-- aunque sí salía la plata de la cuenta — dos verdades distintas sobre el
-- mismo dinero.
alter table public.expenses
  add column if not exists source text
    check (source is null or source = 'debt_payment');

alter table public.expenses
  add column if not exists source_ref_id uuid;

create index if not exists idx_expenses_source on public.expenses (source, source_ref_id);
