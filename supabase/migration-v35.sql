-- =============================================================================
-- Migración v35 — Deudas que ya venías pagando antes de usar Cachin'
--
-- EL PROBLEMA. Registrar una deuda que arrastras de antes obliga hoy a elegir
-- entre dos mentiras. Si marcas como pagadas las cuotas que ya cubriste, cada
-- una descuenta dinero de una cuenta y cuenta como gasto de la quincena —
-- dinero que saliste de tu bolsillo hace meses, no ahora: el saldo baja hoy sin
-- motivo y el presupuesto de esta quincena se dispara. Si no las marcas, la
-- deuda miente al revés: dice que debes el total original cuando ya llevas la
-- mitad pagada.
--
-- Ninguna de las dos sirve, y la diferencia entre ambas no es de cálculo sino
-- de HECHO: esos pagos ocurrieron fuera de la app. El ledger de Cachin' empieza
-- el día que empiezas a usarla; lo anterior es saldo de apertura, no
-- movimiento.
--
-- LA COLUMNA. `paid_offline` marca exactamente eso: la cuota está pagada y
-- resta de lo que debes, pero no tiene —ni debe tener— movimiento en el ledger
-- ni gasto espejo. Es el mismo criterio que ya distingue `debts.kind`
-- ('prestamo' entra a una cuenta, 'credito' no): un dato del mundo real que
-- decide si se escribe en el ledger o no.
--
-- POR QUÉ UNA COLUMNA Y NO DEDUCIRLO. Se podría inferir "pagada sin gasto
-- espejo = pagada antes de la app", pero eso es justo lo que
-- `npm run check:coherence` busca como SÍNTOMA DE BUG: el chequeo de deudas ya
-- encontró en producción seis pagos reales a los que les faltaba su gasto. Sin
-- una marca explícita, un pago histórico legítimo y un pago roto se ven igual,
-- y el chequeo tendría que dejar de avisar de los dos.
--
-- Aditiva e idempotente. Las filas existentes quedan en `false`, que es lo que
-- eran: pagos hechos dentro de la app, con su espejo en el ledger.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v34 aplicadas.
-- =============================================================================

alter table public.debt_installments
  add column if not exists paid_offline boolean not null default false;

comment on column public.debt_installments.paid_offline is
  'La cuota se pagó antes de usar Cachin (o fuera de la app). Cuenta como '
  'pagada para lo que debes, pero NO tiene movimiento en savings_movements ni '
  'gasto espejo en expenses, porque ese dinero salió de tu bolsillo antes de '
  'que el ledger existiera. check-coherence la excluye del cuadre de deudas.';

-- No hace falta tocar RLS: la columna hereda las políticas de
-- debt_installments (own_select/insert/update/delete), que ya filtran por
-- user_id. Tampoco índice: se lee junto a la fila de la cuota, que ya viene
-- filtrada por debt_id.

-- -----------------------------------------------------------------------------
-- REVERSIÓN (-- down). Ojo: al quitar la columna, las cuotas pagadas antes de
-- la app pasan a ser indistinguibles de las pagadas dentro, y
-- `npm run check:coherence` empezará a reportarlas como descuadre de ledger.
--
-- alter table public.debt_installments drop column if exists paid_offline;
-- -----------------------------------------------------------------------------
