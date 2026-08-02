-- =============================================================================
-- Migración v30 — Código personal como segundo factor real
--
-- El bloqueo de la app (lib/appLock.ts) vivía entero en localStorage: un PIN
-- hasheado en el dispositivo, que nunca tocaba el servidor. Era una pantalla
-- de "¿eres tú?" DESPUÉS de que Supabase Auth ya te dejó entrar — cualquiera
-- con la contraseña entraba desde otro navegador sin ver esa pantalla jamás.
--
-- Ahora el código se guarda por usuario y se verifica en el servidor.
--
-- SOBRE EL CIFRADO — decisión deliberada:
-- `personal_code` NO guarda el código en claro NI un hash. Guarda el código
-- CIFRADO de forma reversible (AES-256-GCM) con una llave que vive fuera de
-- la base, en la variable de entorno PERSONAL_CODE_SECRET.
--   · Reversible y no hash: el usuario tiene que poder RECUPERAR su código
--     olvidado reautenticándose con su contraseña (ver "¿Olvidaste tu
--     código?"), no solo reasignarlo a ciegas.
--   · Cifrado y no texto plano: un volcado de esta tabla —o la clave
--     service_role, que bypasea RLS— no revela el código de nadie. Importa
--     más ahora que la app admite varios usuarios: son códigos de 6 dígitos
--     y la gente reusa los del banco y el teléfono.
-- Por eso tampoco hay un CHECK de formato: la base ve texto cifrado, no
-- dígitos. El formato se valida en la app, en el cliente Y en el servidor
-- (lib/personalCode.ts → isValidPersonalCode).
--
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query.
-- Requiere migration-v9 a v29 aplicadas.
-- =============================================================================

alter table public.user_profile
  add column if not exists personal_code text,
  add column if not exists personal_code_active boolean not null default false;

comment on column public.user_profile.personal_code is
  'Código personal de 6 dígitos CIFRADO (AES-256-GCM, llave en la variable de entorno PERSONAL_CODE_SECRET). Ni claro ni hasheado: reversible a propósito, para que el usuario pueda recuperarlo reautenticándose. Ver lib/personalCodeCrypto.ts.';
comment on column public.user_profile.personal_code_active is
  'Asignar el código NO lo activa: hace falta un paso explícito. Solo con esto en true se pide al iniciar sesión.';

-- Un código sin activar es válido (asignado, aún no exigido), pero activo sin
-- código no significa nada — sería un bloqueo imposible de pasar.
alter table public.user_profile drop constraint if exists personal_code_active_needs_code;
alter table public.user_profile
  add constraint personal_code_active_needs_code
  check (personal_code_active = false or personal_code is not null);

-- =============================================================================
-- REVERSIÓN (-- down)
-- =============================================================================
-- alter table public.user_profile drop constraint if exists personal_code_active_needs_code;
-- alter table public.user_profile drop column if exists personal_code_active;
-- alter table public.user_profile drop column if exists personal_code;
