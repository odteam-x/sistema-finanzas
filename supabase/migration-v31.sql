-- =============================================================================
-- Migración v31 — Revincular dos gastos con su movimiento espejo
--
-- NO cambia el esquema: es una corrección de datos puntual, de una sola vez.
--
-- Origen: una versión anterior de deleteDebt() re-etiquetaba el movimiento
-- del ledger a source='manual' y source_ref_id=NULL al eliminar una deuda,
-- pero dejaba el gasto espejo apuntando a la nada. El código actual ya
-- re-etiqueta AMBOS lados correctamente, así que el bug de origen no existe;
-- lo que queda son dos pares que se quedaron desparejados de aquella época.
--
-- IMPORTANTE — lo que este arreglo NO hace: no inserta movimientos. Los
-- espejos SÍ existen (se comprobó consultando la base), solo perdieron el
-- vínculo. Insertar uno nuevo habría restado el dinero DOS veces.
--
-- Pares a reconectar (usuario f907da25-48c2-410d-9103-592e94c21f12):
--   · Gasto c9924a1a… RD$1500 del 2026-07-15  ←→  movimiento e7781914…
--   · Gasto 9e912b9f… RD$200  del 2026-07-31  ←→  movimiento 2b914493…
--
-- Sobre el RD$200: hay DOS movimientos idénticos ese día, a las 05:55
-- (2b914493…) y a las 06:00 (ac585370…), para UN solo gasto. Se empareja el
-- primero por ser el que corresponde cronológicamente al gasto. El segundo se
-- deja intacto a propósito: es dinero real y decidir si fue un doble registro
-- corresponde al usuario, no a una migración. check:coherence no lo marcará,
-- porque los movimientos source='manual' no se cruzan contra ningún origen.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v30 aplicadas.
-- =============================================================================

update public.savings_movements
set source_ref_id = 'c9924a1a-e5d2-4a86-a717-0b634e12dd44'
where id = 'e7781914-8e3f-4bf2-a605-54e99e82ce88'
  and source_ref_id is null;

update public.savings_movements
set source_ref_id = '9e912b9f-92e0-43b2-9594-457d6d4d0d53'
where id = '2b914493-bc21-495b-8fa6-b10b8125c511'
  and source_ref_id is null;

-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- update public.savings_movements set source_ref_id = null
--  where id in ('e7781914-8e3f-4bf2-a605-54e99e82ce88',
--               '2b914493-bc21-495b-8fa6-b10b8125c511');
