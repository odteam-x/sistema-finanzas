-- =============================================================================
-- Migración v11 — FASE 3: Cobros y Préstamos (dinero que te deben a TI)
--
-- Espejo de Deudas pero al revés: una deuda es dinero que YO debo (sale al
-- pagar); un cobro/préstamo es dinero que ME deben (entra al recibirlo).
--   'cobro'    = alguien te debe (te vendiste algo, te quedaron debiendo…)
--   'prestamo' = tú le prestaste dinero a alguien
-- Misma tabla porque la mecánica es idéntica (pago único o cuotas, estados,
-- cobro parcial); solo cambia la etiqueta y el copy.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 y v10 aplicadas.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Tablas
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.receivables (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  kind               text not null check (kind in ('cobro', 'prestamo')),
  name               text not null,            -- quién te debe / a quién le prestaste
  total_amount       numeric(12, 2) not null check (total_amount > 0),
  acquired_date      date not null,
  due_date           date,                     -- solo pago único
  payment_type       text not null default 'unico' check (payment_type in ('unico', 'cuotas')),
  installments_count int,
  installment_amount numeric(12, 2),
  frequency          text check (frequency in ('semanal', 'quincenal', 'mensual')),
  status             text not null default 'pendiente'
                     check (status in ('pendiente', 'parcial', 'cobrada')),
  note               text,
  created_at         timestamptz not null default now()
);

create table if not exists public.receivable_installments (
  id             uuid primary key default gen_random_uuid(),
  receivable_id  uuid not null references public.receivables (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  seq            int not null,
  due_date       date not null,
  amount         numeric(12, 2) not null,
  paid           boolean not null default false,   -- "cobrada"
  paid_date      date
);

create index if not exists idx_receivables_user on public.receivables (user_id, created_at desc);
create index if not exists idx_receivable_inst_parent on public.receivable_installments (receivable_id);
create index if not exists idx_receivable_inst_user on public.receivable_installments (user_id, due_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — RLS (mismo patrón que el resto de las tablas)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.receivables             enable row level security;
alter table public.receivable_installments enable row level security;

do $$
declare
  t text;
  tables text[] := array['receivables', 'receivable_installments'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);

    execute format(
      'create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3 — Nuevo origen en el ledger: dinero que ENTRA al cobrar.
-- Un cobro pendiente NO suma al balance; solo cuando se recibe se crea el
-- depósito (mismo criterio que las deudas: el compromiso no mueve dinero).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.savings_movements drop constraint if exists savings_movements_source_check;
alter table public.savings_movements
  add constraint savings_movements_source_check
  check (source in ('manual', 'salary', 'subscription', 'debt_payment',
                    'goal_contribution', 'receivable_collected'));


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 4 — Estado calculado por la base (mismo criterio D3 que las deudas):
-- lo recalcula un trigger, no la aplicación.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.recompute_receivable_status()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_id    uuid;
  v_total int;
  v_paid  int;
begin
  v_id := coalesce(new.receivable_id, old.receivable_id);

  select count(*), count(*) filter (where paid)
    into v_total, v_paid
    from public.receivable_installments
   where receivable_id = v_id;

  if v_total > 0 then
    update public.receivables
       set status = case
                      when v_paid = 0       then 'pendiente'
                      when v_paid = v_total then 'cobrada'
                      else 'parcial'
                    end
     where id = v_id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_recompute_receivable_status on public.receivable_installments;
create trigger trg_recompute_receivable_status
  after insert or update or delete on public.receivable_installments
  for each row execute function public.recompute_receivable_status();


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop trigger if exists trg_recompute_receivable_status on public.receivable_installments;
-- drop function if exists public.recompute_receivable_status();
-- drop table if exists public.receivable_installments;
-- drop table if exists public.receivables;
-- alter table public.savings_movements drop constraint if exists savings_movements_source_check;
-- alter table public.savings_movements
--   add constraint savings_movements_source_check
--   check (source in ('manual','salary','subscription','debt_payment','goal_contribution'));
