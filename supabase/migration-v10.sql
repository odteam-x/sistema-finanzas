-- =============================================================================
-- Migración v10 — FASE 2: reglas de dominio de Deudas
--   R02: historial de incrementos de una deuda (en vez de sobreescribir el monto).
--   D3:  el estado de la deuda lo calcula la BASE (trigger), no la aplicación.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere haber corrido migration-v9.sql antes.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 0 — DIAGNÓSTICO (solo lectura). Corre esto primero y revisa.
-- ─────────────────────────────────────────────────────────────────────────────
select 'deudas totales'            as concepto, count(*) as filas from public.debts
union all
select 'deudas marcadas pagadas',  count(*) from public.debts where status = 'pagada'
union all
select 'deudas de pago unico',     count(*) from public.debts where payment_type = 'unico'
union all
select 'deudas en cuotas',         count(*) from public.debts where payment_type = 'cuotas'
union all
select 'cuotas pagadas',           count(*) from public.debt_installments where paid = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — R02: historial de incrementos.
-- Cuando le vuelves a deber a la misma persona, se agrega una fila acá en vez
-- de sobreescribir `debts.total_amount`. El total real de la deuda pasa a ser
-- total_amount + Σ incrementos, con el desglose visible en la UI.
-- Un incremento NO genera movimiento de dinero (coherente con R01: deber más
-- no es gastar; el dinero solo se mueve al pagar).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.debt_increments (
  id         uuid primary key default gen_random_uuid(),
  debt_id    uuid not null references public.debts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     numeric(12, 2) not null check (amount > 0),
  date       date not null,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_debt_increments_debt on public.debt_increments (debt_id);
create index if not exists idx_debt_increments_user on public.debt_increments (user_id, date desc);

alter table public.debt_increments enable row level security;

drop policy if exists "own_select" on public.debt_increments;
drop policy if exists "own_insert" on public.debt_increments;
drop policy if exists "own_update" on public.debt_increments;
drop policy if exists "own_delete" on public.debt_increments;

create policy "own_select" on public.debt_increments
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.debt_increments
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.debt_increments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on public.debt_increments
  for delete using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — D3: el estado de una deuda en cuotas lo mantiene la BASE.
--
-- Antes lo reescribía la aplicación a mano después de cada pago
-- (recomputeStatus en deudas/actions.ts) — justo el patrón de "columna
-- cacheada que se actualiza desde el cliente" que queremos eliminar: si un
-- pago se registraba por otra vía, el estado quedaba desincronizado.
-- Ahora cualquier cambio en debt_installments recalcula el estado solo.
--
-- Solo aplica a deudas EN CUOTAS. Las de pago único no tienen cuotas, así que
-- su estado lo sigue marcando el toggle explícito del usuario (es la única
-- señal que existe para ellas).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.recompute_debt_status()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_debt_id uuid;
  v_total   int;
  v_paid    int;
begin
  v_debt_id := coalesce(new.debt_id, old.debt_id);

  select count(*), count(*) filter (where paid)
    into v_total, v_paid
    from public.debt_installments
   where debt_id = v_debt_id;

  if v_total > 0 then
    update public.debts
       set status = case
                      when v_paid = 0       then 'pendiente'
                      when v_paid = v_total then 'pagada'
                      else 'parcial'
                    end
     where id = v_debt_id;
  end if;

  return null; -- AFTER trigger: el valor de retorno se ignora
end;
$$;

drop trigger if exists trg_recompute_debt_status on public.debt_installments;
create trigger trg_recompute_debt_status
  after insert or update or delete on public.debt_installments
  for each row execute function public.recompute_debt_status();

-- Recalcular una vez el estado de todas las deudas en cuotas existentes,
-- por si alguna quedó desincronizada con el método anterior.
update public.debts d
   set status = sub.nuevo_estado
  from (
    select debt_id,
           case
             when count(*) filter (where paid) = 0            then 'pendiente'
             when count(*) filter (where paid) = count(*)     then 'pagada'
             else 'parcial'
           end as nuevo_estado
      from public.debt_installments
     group by debt_id
  ) sub
 where d.id = sub.debt_id
   and d.status is distinct from sub.nuevo_estado;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop trigger if exists trg_recompute_debt_status on public.debt_installments;
-- drop function if exists public.recompute_debt_status();
-- drop table if exists public.debt_increments;
