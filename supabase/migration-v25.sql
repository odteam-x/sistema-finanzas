-- =============================================================================
-- Migración v25 — Bloque 12: push real (Web Push + VAPID)
--
-- Una fila por dispositivo/navegador suscrito (endpoint único) — el mismo
-- usuario puede tener varios (celular + laptop). El servidor firma cada
-- envío con la clave VAPID privada (nunca en esta tabla, vive en variables
-- de entorno) y la despacha vía Web Push usando p256dh/auth.
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v24 aplicadas.
-- =============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

do $$
declare
  t text := 'push_subscriptions';
begin
  execute format('drop policy if exists "own_select" on public.%I;', t);
  execute format('drop policy if exists "own_insert" on public.%I;', t);
  execute format('drop policy if exists "own_update" on public.%I;', t);
  execute format('drop policy if exists "own_delete" on public.%I;', t);
  execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
  execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
  execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id);', t);
  execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
end $$;


-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- drop table if exists public.push_subscriptions;
