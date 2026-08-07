# Aislamiento entre usuarios — Cachin'

Qué se revisó antes de abrir el registro público, y con qué evidencia. Un
repaso que no encuentra nada solo sirve si queda escrito qué se miró: sin esto,
el siguiente cambio no sabe qué invariantes está obligado a mantener.

Fecha del repaso: Fase 27.

---

## Base de datos

Medido contra el proyecto real, no leído del esquema:

```sql
select count(*) from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where c.relkind = 'r';
```

| Comprobación | Resultado |
|---|---|
| Tablas en `public` | 22 |
| Con RLS activo | 22 |
| Políticas totales | 88 (cuatro por tabla) |
| Políticas cuya expresión NO menciona `uid()` | **0** |

La consulta que lo verifica busca tablas *sin* RLS, con menos de cuatro
políticas, o con alguna política que no filtre por `uid()`. Devuelve cero
filas. Si alguna vez devuelve algo, hay una fuga.

## `service_role`

`lib/supabase/serviceRole.ts` tiene **un solo consumidor**:
`app/api/cron/daily-alerts/route.ts`.

Es el único sitio donde hace falta —recorre las suscripciones de todos los
usuarios para mandar avisos— y se protege con `CRON_SECRET` en la cabecera
`authorization`, devolviendo 401 sin él. No es invocable desde el navegador.

**Si `serviceRole` aparece alguna vez en una ruta que responda a un usuario, es
una vía de fuga.** Esa es la invariante que hay que vigilar.

## Server Actions

Diecinueve reciben un `id` (`deleteExpense(id)`, `updateDebt(id)`, …). Una
Server Action es un endpoint público: que la interfaz no muestre el botón no
impide la llamada.

Todas usan `@/lib/supabase/server` — el cliente **autenticado**, no
`service_role`. Con él, RLS se aplica a cada consulta: un `update ... in (id)`
sobre una fila de otra cuenta afecta cero filas, y un `select` no la devuelve.

`lib/softDelete.ts` no filtra por `user_id` explícitamente y **es correcto**:
se apoya en RLS con el cliente autenticado. Lo que lo haría incorrecto es
cambiarlo a `service_role`.

## Rutas de API

| Ruta | Protección |
|---|---|
| `/api/push/subscribe` | Valida la sesión con `getUser()` y ata la suscripción a `user.id` |
| `/api/cron/daily-alerts` | Valida `CRON_SECRET`; 401 sin él |

## Datos sembrados

- **Etiquetas iniciales**: por la función `seed_default_tags`, que **no** es
  `SECURITY DEFINER` y usa `auth.uid()`. Se insertan como el usuario que las
  pide, con RLS activa.
- **Feriados dominicanos** (`lib/holidays-do.ts`): una lista en el cliente que
  solo sugiere; no son filas compartidas en la base.

## Caché de Next.js

Cero usos de `unstable_cache`, `export const revalidate` o `force-static` en
todo el proyecto. No hay ninguna página cacheada con una clave que no incluya
al usuario, que serviría los datos de A a B.

`revalidateEverything()` invalida rutas, y cada ruta se vuelve a renderizar con
la sesión de quien la pide.

## localStorage — el hueco que sí había

Era el único punto real de fuga, y no estaba en la base sino en el cliente. Ver
`lib/storageKey.ts` y el commit `27.1.1`.

Resumen: las claves eran globales del navegador, así que dos personas en el
mismo aparato compartían estado — incluida la cola de pendientes con dinero sin
enviar. Ahora llevan el usuario dentro, el cierre de sesión las borra, y
`flushQueue()` descarta lo que encoló otra cuenta.

**Tres claves siguen siendo globales a propósito**: `splash-seen`, `theme` y
`text-scale`. Son del dispositivo, no de la cuenta, y cada excepción está
justificada en el propio `storageKey.ts`.

---

## Lo que falta antes de abrir el registro

La **prueba de humo con dos cuentas reales** (punto 1.4 de la Fase 27). Esta
auditoría dice que el mecanismo es correcto; la prueba de humo dice que además
funciona. No son lo mismo y no se sustituyen.
