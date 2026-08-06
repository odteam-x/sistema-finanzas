-- =============================================================================
-- Migración v32 — Escala de texto por cuenta
--
-- El tamaño del texto es una preferencia de ACCESIBILIDAD, y por eso va en la
-- base y no solo en localStorage como el modo claro/oscuro: quien necesita
-- texto grande lo necesita en todos sus dispositivos, no solo en el que tuvo
-- a mano cuando lo configuró. Al entrar en un teléfono nuevo la app la lee de
-- aquí y la siembra en ese dispositivo.
--
-- localStorage sigue existiendo como copia: es lo que aplica la escala ANTES
-- del primer pintado (el mismo script de arranque que ya evita el parpadeo del
-- tema). La base no puede hacer eso — llega después.
--
-- Los cuatro valores son cerrados a propósito, no un rango libre: cada uno se
-- comprobó contra las 14 pantallas. Un deslizador continuo dejaría entrar
-- valores intermedios que nadie verificó.
--
-- Idempotente. Se puede correr varias veces sin efecto.
-- =============================================================================

alter table public.user_profile
  add column if not exists text_scale numeric not null default 1;

-- El check va aparte de la columna para que la migración se pueda repetir:
-- `add column if not exists` no vuelve a añadir la restricción si la columna
-- ya existía de una corrida anterior.
alter table public.user_profile drop constraint if exists text_scale_allowed;
alter table public.user_profile
  add constraint text_scale_allowed check (text_scale in (0.9, 1, 1.15, 1.3));

comment on column public.user_profile.text_scale is
  'Multiplicador del tamaño de texto (0.9 | 1 | 1.15 | 1.3). Lo aplica el CSS como --text-scale sobre el font-size raíz.';

-- -----------------------------------------------------------------------------
-- Reversión (no ejecutar salvo que haga falta deshacer):
--
-- alter table public.user_profile drop constraint if exists text_scale_allowed;
-- alter table public.user_profile drop column if exists text_scale;
-- -----------------------------------------------------------------------------
