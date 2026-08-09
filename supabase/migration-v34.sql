-- =============================================================================
-- Migración v34 — Endurecer las funciones antes de que entre gente de fuera
--
-- El registro público está abierto (`disable_signup: false`), así que
-- `/rest/v1/rpc/*` deja de ser algo que solo toca una persona conocida. Estas
-- dos correcciones las señaló el advisor de seguridad de Supabase.
--
-- 1. `rls_auto_enable()` es la ÚNICA función SECURITY DEFINER del esquema, y
--    `anon` podía ejecutarla sin sesión. Lo que hace es activar RLS en las
--    tablas —o sea, endurecer, no abrir— y ya tiene `search_path` fijado, así
--    que el daño real es bajo. Pero es una función privilegiada expuesta a
--    internet, y nada de la app la llama por RPC: se comprobó buscando
--    `rls_auto_enable` en app/, lib/ y scripts/, y no aparece. Es de
--    mantenimiento, se corre a mano desde el editor SQL.
--
--    Una función privilegiada que nadie llama no debería estar expuesta:
--    revocarla no rompe nada hoy y cierra la puerta para cuando alguien le
--    añada un parámetro sin acordarse de que era pública.
--
-- 2. Las otras ocho no tienen `search_path` fijo. Son SECURITY INVOKER —corren
--    con los permisos de quien llama, así que RLS se les aplica— y por eso el
--    riesgo es mucho menor que si fueran DEFINER. Aun así, dejar el
--    `search_path` a merced del cliente permite que una llamada resuelva un
--    nombre de tabla o de operador hacia un esquema puesto por el atacante.
--    Fijarlo cuesta una línea por función.
--
-- Idempotente. Se puede correr varias veces sin efecto.
-- =============================================================================

-- 1. La única SECURITY DEFINER deja de ser invocable desde la API pública.
--
--    OJO CON A QUIÉN SE LE REVOCA. El primer intento fue
--    `from anon, authenticated` y no quitó nada: el ACL de la función era
--    "=X/postgres", y ese grantee vacío es PUBLIC. anon y authenticated no
--    tenían el permiso a su nombre — lo HEREDABAN. El advisor lo seguía
--    marcando después de aplicar la revocación, que es como se detectó.
--
--    service_role conserva su grant explícito, así que el mantenimiento (que
--    es para lo que existe esta función) sigue funcionando igual.
revoke execute on function public.rls_auto_enable() from public;

-- 2. search_path fijo en las que no lo tenían. `public, pg_temp` es el par
--    habitual: `pg_temp` al final para que un esquema temporal del atacante no
--    pueda anteponerse a los objetos reales.
alter function public.recompute_debt_status() set search_path = public, pg_temp;
alter function public.recompute_receivable_status() set search_path = public, pg_temp;
alter function public.get_movement_stats(date, date, text, text) set search_path = public, pg_temp;
alter function public.pay_debt(uuid, uuid, numeric, uuid, text) set search_path = public, pg_temp;
alter function public.unpay_debt(uuid, uuid) set search_path = public, pg_temp;
alter function public.collect_receivable(uuid, uuid, numeric, uuid, text) set search_path = public, pg_temp;
alter function public.uncollect_receivable(uuid, uuid) set search_path = public, pg_temp;
alter function public.purge_deleted(integer) set search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- Reversión (no ejecutar salvo que haga falta deshacer):
--
-- grant execute on function public.rls_auto_enable() to anon, authenticated;
-- alter function public.recompute_debt_status() reset search_path;
-- ... (y así con las demás)
-- -----------------------------------------------------------------------------
