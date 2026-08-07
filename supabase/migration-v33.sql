-- =============================================================================
-- Migración v33 — Estado de configuración y de primeros pasos, por usuario
--
-- Resuelve dos cosas que hoy se ADIVINAN, y adivinar mal tiene consecuencias
-- distintas en cada caso.
--
-- 1. ¿El usuario confirmó cuándo cobra?
--
--    `salary_settings` nace con pay_day_1=15 y pay_day_2=30. No es una fuga
--    entre cuentas, pero sí una suposición: quien no la cambia ve TODOS los
--    cálculos de quincena, presupuesto por día y estimado del mes salir de unos
--    días que nunca eligió, y nada en la pantalla dice que están adivinados.
--
--    Hoy se infiere con `pay_day_1 !== 15 || pay_day_2 !== 30`, que falla justo
--    para quien de verdad cobra los 15 y 30: a esa persona la app le pediría
--    para siempre que configure algo que ya está bien. Una marca explícita no
--    tiene ese problema.
--
-- 2. ¿Terminó los primeros pasos?
--
--    Va en la base y no en localStorage a propósito: es estado de la CUENTA.
--    En localStorage, entrar desde otro teléfono volvería a mostrar la
--    bienvenida y los pasos ya hechos — y con la Fase 27 el almacenamiento se
--    limpia al cerrar sesión, así que se perdería en cada salida.
--
-- Idempotente. Se puede correr varias veces sin efecto.
-- =============================================================================

-- 1. Confirmación explícita del ciclo de cobro.
alter table public.salary_settings
  add column if not exists confirmed_at timestamptz;

comment on column public.salary_settings.confirmed_at is
  'Cuándo el usuario guardó su ciclo de cobro a propósito. NULL = los días son el default del esquema, no una elección: las pantallas que dependen de ellos deben avisarlo en vez de mostrar cifras adivinadas.';

-- 2. Primeros pasos.
alter table public.user_profile
  add column if not exists welcome_seen boolean not null default false;

alter table public.user_profile
  add column if not exists onboarding_skipped text[] not null default '{}';

comment on column public.user_profile.welcome_seen is
  'La pantalla de bienvenida se muestra UNA vez por usuario. Aquí y no en localStorage: es de la cuenta, y el almacenamiento local se limpia al cerrar sesión.';

comment on column public.user_profile.onboarding_skipped is
  'Pasos opcionales que el usuario descartó con "Ahora no" (ej. {deudas,seguridad}). Un paso omitido cuenta como resuelto para dejar de pedirlo, pero se distingue de uno hecho.';

-- -----------------------------------------------------------------------------
-- Reversión (no ejecutar salvo que haga falta deshacer):
--
-- alter table public.user_profile drop column if exists onboarding_skipped;
-- alter table public.user_profile drop column if exists welcome_seen;
-- alter table public.salary_settings drop column if exists confirmed_at;
-- -----------------------------------------------------------------------------
