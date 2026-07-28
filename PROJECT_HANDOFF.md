# Cachin' — Documento de traspaso de proyecto

Este documento resume todo lo necesario para que otro asistente de IA (o
una sesión nueva sin memoria previa) pueda seguir trabajando en este
proyecto sin perder contexto. Está escrito para pegarse como primer mensaje
o system prompt en una conversación nueva.

---

## 1. Qué es el proyecto

**Cachin'** es una PWA de finanzas personales, de un solo usuario, en
español dominicano. Cubre: sueldo/ingresos, presupuesto diario por
categoría (ciclo quincenal, no mensual), ahorros/metas, deudas, cobros
(dinero que te deben), suscripciones recurrentes, reportes, calendario
financiero unificado, un asistente conversacional con IA, y —como del
bloque 11 en adelante— bloqueo local (PIN/biometría), multi-moneda,
auto-categorización, cola offline-first y notificaciones push reales.

- **Usuario real:** una sola persona (agsupplytic@gmail.com), no es un
  producto multi-tenant. Todas las decisiones de arquitectura asumen esto.
- **Idioma:** todo el código, comentarios, UI y commits están en español
  (dominicano donde aplica — "colmado", "concho", quincena, etc.).
- **Moneda:** RD$ (DOP) por defecto; USD/EUR soportadas desde el Bloque 8b
  como secundarias, con tasa de cambio editable a mano (RD no tiene un feed
  automático confiable).
- **Zona horaria:** America/Santo_Domingo, fijada en `lib/time.ts`.

## 2. Stack técnico

- **Next.js 16** (App Router), Server Components + Server Actions
  (`"use server"`, patrón `ActionResult = { ok: boolean; error?: string }`).
- **Supabase**: Postgres + Auth + Row Level Security. Sin ORM — queries
  directas vía `@supabase/supabase-js` / `@supabase/ssr`.
- **Tailwind v4** (`@theme` en `app/globals.css`, sin config JS aparte).
- **Framer Motion** para animaciones, **Radix UI** primitives (Select,
  Dialog/Modal, Tabs, DropdownMenu) envueltos en componentes propios.
- **Phosphor Icons** (`@phosphor-icons/react`) — set único de íconos, mapa
  centralizado en `components/ui/Icon.tsx`.
- **web-push** (Bloque 12) para notificaciones push reales con VAPID.
- Sin frameworks de testing automatizado — la verificación es
  build+lint+browser manual en cada bloque.

## 3. Repositorio y despliegue

- GitHub: `odteam-x/sistema-finanzas`, rama `main`.
- **Auto-deploy a Vercel en cada push a `main`** — no hay staging/preview
  intermedio en el flujo normal de trabajo.
- `vercel.json` define un **cron job** (`/api/cron/daily-alerts`, diario a
  las 12:00 UTC = 8am hora RD) agregado en el Bloque 12.
- Working directory local: `C:\Users\judit\Downloads\Sistema de finanzas`.

## 4. Arquitectura de datos — lo más importante de entender

El dinero **no** vive en una sola tabla `movements`. Vive en **3 tablas
enlazadas**, decisión tomada explícitamente hace tiempo (no fusionar el
esquema, sí unificar el *cálculo*):

- `savings_movements` — el ledger autoritativo de cuentas (depósitos,
  retiros, transferencias). Tiene `source` (`manual`, `salary`,
  `subscription`, `debt_payment`, `goal_contribution`,
  `receivable_collected`, `debt_disbursement`) y `source_ref_id`.
- `expenses` — gastos (con `tag_id` para categoría, `source`/`source_ref_id`
  cuando el gasto lo generó otra cosa, ej. un pago de deuda).
- `salaries` — ingresos/sueldos (con `confirmed: boolean` — un sueldo
  auto-generado no cuenta como disponible hasta que el usuario lo confirma).

Se leen/calculan siempre a través de helpers compartidos
(`lib/balances.ts`) y de la vista SQL `v_account_balances` (evita traer el
historial completo a JS para sumar). **Nunca fusionar estas 3 tablas** salvo
que sea una decisión explícita y discutida — ya se evaluó y se descartó.

### ⚠️ Gotcha crítico: `source_ref_id` no siempre significa lo mismo

- Para un **gasto manual** (`addExpense`): `savings_movements.source_ref_id`
  apunta directo a `expenses.id` (relación padre→hijo).
- Para un **pago de deuda** (`recordDebtPayment`/`payDebt` RPC): el
  movimiento y el gasto son **hermanos** — ambos apuntan al mismo id externo
  (la deuda/cuota pagada), NO uno al otro. Esto causó bugs reales (falsos
  positivos en el script de coherencia) hasta que se rastreó el código real
  de inserción. Si escribes una query que asuma `movement.source_ref_id ===
  expense.id` universalmente, va a estar mal para pagos de deuda.

### Otras piezas del modelo de datos

- `debt_installments` y `receivable_installments` **NO tienen** `deleted_at`
  — viven/mueren con su padre (`ON DELETE CASCADE`), a diferencia de casi
  todo lo demás que usa borrado suave.
- **Borrado suave (R15):** casi todas las tablas tienen `deleted_at`; borrar
  es un `UPDATE deleted_at = now()`, no un `DELETE`. Hay un patrón de
  "Deshacer" con token (`lib/softDelete.ts`, `app/(app)/undo-actions.ts`).
- **RPC transaccionales** (Postgres `security invoker`, no todo pasa por
  esto todavía): `pay_debt()`/`unpay_debt()`, `collect_receivable()`/
  `uncollect_receivable()`. Los callers en TS intentan la RPC primero y
  caen a inserts secuenciales si la migración que la crea no se ha corrido
  todavía (patrón de degradación consistente en todo el proyecto: si una
  vista/función nueva no existe aún, todo sigue funcionando con el camino
  viejo).
- **Multi-moneda (Bloque 8b):** la moneda vive en la CUENTA
  (`savings_accounts.currency`), no en cada movimiento — un movimiento ya
  está implícitamente en la moneda de su cuenta. Es **inmutable después de
  crear la cuenta** (cambiarla reinterpretaría todo el historial). Tasas de
  cambio en `exchange_rates` (una fila por moneda no-DOP en uso, editadas a
  mano). Transferencias entre cuentas de monedas distintas están
  bloqueadas. Helpers en `lib/currency.ts`.
- **Auto-categorización (Bloque 8c):** `categorization_rules` (keyword
  normalizada → tag_id). `lib/categorize.ts` tiene `normalizeKeyword()`
  (minúsculas + sin acentos) y `matchTagForNote()`. Se aplica al registrar
  un gasto sin categoría Y retroactivamente a gastos históricos sin
  categoría (`lib/categorizeCatchUp.ts`, llamado al inicio de la página de
  Presupuesto, mismo patrón que los "catch-up" de sueldo/suscripciones).
- **Cuenta colchón (Bloque 10b):** `savings_accounts.is_cushion` +
  `cushion_payout_amount` + `cushion_target_account_id` — para ingresos
  variables/freelance. Un botón "Pagarme esta quincena" transfiere el monto
  fijo configurado. Solo una cuenta colchón por usuario (índice único).
- **Bloqueo local (Bloque 11):** `lib/appLock.ts` — PIN con hash+sal
  (SubtleCrypto, `localStorage`, NUNCA en el servidor) + biometría opcional
  vía WebAuthn de plataforma **sin verificación server-side** (que el
  navegador entregue una aserción ya implica que el sensor verificó a la
  persona — es un bloqueo local, no un login remoto). Es un bloqueo
  **visual/de interfaz**, no cifrado: los datos que el servidor ya envió en
  el payload de React siguen ahí aunque no se pinten. Modelo aceptado
  explícitamente (TLS + cifrado en reposo de Supabase para
  transporte/almacenamiento, este bloqueo para el acceso casual al
  dispositivo).
- **Cola offline-first (Bloque 12):** `lib/offlineQueue.ts` —
  **alcance acotado a propósito** a los 3 formularios rápidos del FAB
  (Gasto/Ingreso/Movimiento). El resto de formularios de la app sigue
  fallando sin red como antes (no es un olvido, es una decisión de alcance
  documentada — encolar CUALQUIER Server Action de la app exigiría un
  registro mucho más grande).
- **Push real (Bloque 12):** VAPID + `web-push`, tabla
  `push_subscriptions`. Dos disparadores: inmediato (un gasto que cruza
  80%/100% del presupuesto de la quincena, detectado comparando el total
  antes/después de ESE gasto específico, sin tabla de "ya avisado") y cron
  diario (`app/api/cron/daily-alerts`, deudas de pago único + suscripciones
  que vencen en 3 días).

### Verificación de sesión: `getClaims()`, no `getUser()`

`lib/auth.ts` y `lib/supabase/middleware.ts` verifican con
`supabase.auth.getClaims()`. **No cambiar a `getUser()` "por seguridad"** —
las dos verifican, la diferencia es dónde:

- `getUser()` pregunta al servidor de Auth en cada llamada. Medido contra este
  proyecto: 90–600 ms por viaje, y se pagaba **dos veces por navegación**
  (middleware + layout) antes de la primera consulta de datos.
- `getClaims()` comprueba la **firma** del JWT con la clave pública del
  proyecto. Este proyecto firma con **ES256** (asimétrica — se ve en
  `/auth/v1/.well-known/jwks.json`), así que la comprobación es criptográfica
  y local: **1 ms**. El JWKS se descarga una vez por proceso y vive en
  `GLOBAL_JWKS`, una caché de módulo de `auth-js` compartida entre instancias
  del cliente.

Verificado que rechaza: firma falsificada (suplantar otro `sub`), token
caducado y basura — los tres dan `AuthInvalidJwtError`.

Si el proyecto volviera a una clave **simétrica** (HS256), `getClaims()` cae
solo a `getUser()` por red: se pierde la velocidad, nunca la verificación.

`requireUser()` ya no devuelve el `User` completo de Supabase sino
`AuthUser = { id, email }`. Es todo lo que la app usa (65 lecturas de
`user.id`, una de `user.email`) y ambos vienen dentro del propio JWT.

## 5. Migraciones de Supabase

Son **archivos SQL planos numerados** en `supabase/migration-vN.sql`,
**aditivos únicamente** (nunca se edita uno viejo), y el usuario los corre
**manualmente** en el SQL Editor de Supabase (no hay migración automática
en el deploy). Al día de este documento van de **v9 a v25**, todas
aplicadas según confirmó el usuario. Cada archivo nuevo debe:
- Traer un comentario arriba explicando qué hace y por qué.
- Ser aditivo (no rompe si se corre sobre datos existentes).
- Incluir políticas RLS (`own_select/insert/update/delete`, patrón
  `do $$ ... $$` con `execute format(...)` repetido en cada migración).
- Traer una sección de reversión comentada al final (`-- down`).

**Siempre avisar al usuario al final de cualquier respuesta si hay una
migración nueva pendiente de correr** — el asistente nunca la corre él
mismo contra la base de producción.

## 6. Estructura de carpetas / convenciones de código

```
app/(app)/<seccion>/
  page.tsx        — Server Component, hace los queries y arma la UI
  actions.ts       — Server Actions ("use server"), un archivo por sección
  <Componente>.tsx — sub-componentes cliente cuando hace falta interactividad
lib/                — lógica compartida, pura o server-only
components/ui/       — componentes de diseño reutilizables (Button, Field,
                       FormModal, GlassCard, Icon, Money, etc.)
components/nav/       — Sidebar, BottomTabBar, QuickAddFab
supabase/             — migraciones SQL planas
```

Patrones que se repiten en toda la app:
- **`FormModal`** (`components/ui/FormModal.tsx`) es el componente que casi
  todos los formularios de creación/edición usan — recibe una Server Action
  como `action` prop, maneja el modal, el estado de envío y el error.
- **`ActionResult`** (`lib/actions-shared.ts`) es el tipo de retorno
  estándar de toda Server Action de mutación: `{ ok: boolean; error?:
  string }`. Mensajes de error siempre en español, dirigidos al usuario.
- **Server Actions "use server"** solo pueden exportar funciones async —
  nada de `export type` ni re-exports de tipos en esos archivos.
- **`revalidateAll()`** al final de cada acción: cada archivo de acciones
  tiene su propia función que llama `revalidatePath()` sobre todas las
  rutas que dependen de esos datos.
- **Catch-up functions** (`runSalaryCatchUp`, `runSubscriptionCatchUp`,
  `seedDefaultTagsIfEmpty`, `applyCategorizationRulesToPastExpenses`): se
  llaman al INICIO de un Server Component (page.tsx), no son Server
  Actions ni efectos secundarios de un getter — generan/actualizan datos
  derivados antes de leer lo que se va a mostrar.
- **`lib/softDelete.ts`**: borrado suave + token de "Deshacer" reutilizado
  en toda la app.
- **Componentes cliente que leen `localStorage`/APIs del navegador**: usar
  `useSyncExternalStore`, **NO** `useEffect` + `setState` síncrono — el
  linter de este proyecto (`react-hooks/set-state-in-effect`) lo marca como
  error. Ver `lib/appLock.ts` y `lib/offlineQueue.ts` para el patrón exacto
  (store con caché de referencia estable + función `subscribe` + snapshot
  de servidor separado para evitar mismatch de hidratación).
- **Claves de `localStorage`** siempre con prefijo `cachin:` (ver
  `lib/preferences.ts`, `lib/appLock.ts`, `lib/offlineQueue.ts`).

## 7. Sistema visual — "Mobile E-Wallet", superficies sólidas

Rediseño completo de la capa de presentación (no toca datos ni RPC). El
sistema **no tiene glassmorfismo**: cero `backdrop-filter` en el árbol.
Lo que flota (nav, modal, hoja, header sticky) se separa con superficie
opaca + sombra + línea.

- Paleta **teal-only** (`--color-primary`/`--color-accent`) + 4 semánticos
  de ESTADO (`danger/warning/success/info`) + 2 de **dirección del dinero**
  (`--color-income`/`--color-expense`), que son cosa distinta: un gasto
  planificado no es un error. Neutros en gris real; el teal queda para
  marca/CTAs.
- **Tokens que no se pueden saltar**, todos con equivalente dark:
  - `--color-primary-fg` — teal COMO TEXTO. En oscuro `primary` sobre la
    superficie da 3.34:1 y falla AA; este da 5.39:1. Usar siempre este para
    texto/enlaces teal, nunca `text-primary`.
  - `--color-on-tint` — texto secundario sobre un tinte. `muted` se verificó
    contra blanco (4.81:1) pero sobre los tintes cae a 3.89:1.
  - `--color-on-brand` / `-muted` / `-well` — contenido sobre el gradiente.
    `-well` es el pozo sólido para chips e íconos encima del hero (sustituye
    a los `bg-white/15..25`, que dependían del punto del gradiente).
  - `--brand-grad-from` / `-to` — extremos del gradiente. Son tokens propios
    porque el extremo claro tiene que ser **más oscuro en modo oscuro**: con
    el `primary` de dark ni el blanco puro llega a 4.5:1.
  - `--color-surface` / `-raised` / `-sunken` / `-nav` / `-modal` / `-sheet`,
    `--color-line` / `-strong`, `--color-tint-*`, `--radius-hero|card|tile|pill`,
    `--shadow-card|raised|nav|fab|hero`.
- **Nunca usar alfa sobre negro/blanco** (`bg-black/5`, `border-black/5`,
  `bg-white/60`…). Se eliminaron las ~100 que había: en modo oscuro
  desaparecían o aclaraban donde debían oscurecer. Las únicas que quedan son
  3 `bg-black/55`, que son scrims de modal (oscurecer el fondo), no vidrio.
- **Los tamaños de monto se llaman `.money-hero|lg|md|sm`, no `.text-money-*`.**
  El prefijo `text-` hacía que **tailwind-merge los tratara como color** y
  los eliminara al pasar por `cn()` junto a `text-ink`/`text-on-brand`.
- `StatTile` tiene `emphasis="hero" | "normal" | "quiet"`: es el mecanismo
  para que solo haya UNA cifra dominante por pantalla. Los tres escalones son
  fluidos a propósito — mezclar uno fijo con uno fluido invertía el orden en
  móvil.
- Modo oscuro vía `[data-mode="dark"]` en `<html>`, no clases `dark:`.
- Iconos: Phosphor (`@phosphor-icons/react`), mapa en `components/ui/Icon.tsx`,
  peso por defecto **`light`** (el trazo más fino que aguanta 14-16px; `thin`
  se rompe). El peso se cambia una sola vez ahí. Excepción: la barra inferior
  y el sidebar usan `fill` en el ítem activo — es lo que dice de un vistazo en
  qué sección estás. **No migrar a Iconify por su vía normal**: descarga los
  SVG de un CDN en runtime y rompe el offline de la PWA.
- **Ilustraciones (estados vacíos):** dibujos de línea propios, EN LÍNEA en el
  DOM (`components/ui/Illustration.tsx`), no archivos en `public/`. Al ir
  inline consumen los tokens vía las clases `.ill-line` / `.ill-soft` /
  `.ill-fill` definidas en `globals.css`, así que un solo dibujo sirve para
  claro y oscuro. Antes eran de unDraw como `<img>`, lo que obligaba a una
  copia `.dark.svg` por ilustración generada por script. Para añadir una:
  agrega la entrada al mapa `ART` con la misma rejilla 120×96 y esas clases.

## 7b. Barra de estado / theme-color

`components/StatusBarColor.tsx` ajusta `<meta name="theme-color">` según la
ruta y el tema: el gradiente de marca en `/dashboard` (único sitio con hero a
sangre arriba) y el fondo de página en el resto. Retira las metas que emite
Next con `media` y deja una sola sin `media` — con varias, el navegador usa la
primera cuyo media coincida, así que escribir encima de la primera no aplicaba
en modo oscuro. Observa `data-mode` para reaccionar al cambio de tema sin
recargar.
- **Gotcha de Turbopack (dev)**: si algo no refleja un cambio (sobre todo
  tokens de `globals.css` o rutas API nuevas), correr `rm -rf .next` antes
  de reiniciar el dev server — hay caché que se queda obsoleta.

## 7c. Feedback de navegación (`NavIcon`) y por qué offline se siente más
## rápido que online — esto NO es un bug

`components/nav/NavIcon.tsx` envuelve el ícono de cada enlace de
`BottomTabBar`/`Sidebar` con `useLinkStatus()` (Next 15+/React 19): mientras
ESA navegación en particular está pendiente, el ícono baja de opacidad y gira
un anillo. Es por-enlace, no global — no hace falta contexto ni efecto.

Por qué hacía falta: entre que la URL cambia (inmediato, es solo
`history.pushState`) y que la pantalla nueva está lista, no había ninguna
señal de que el toque hubiera registrado. Se sentía como "hay que tocar dos
veces", pero el primer toque sí funcionaba — el usuario solo no lo veía.

**La razón real de fondo, medida:** offline, la navegación de Next intenta
traer el payload de la ruta, falla al instante (no hay red) y cae a la copia
completa cacheada por el Service Worker — se sirve local, sin ninguna
consulta a Supabase. Online, la página SÍ tiene que ejecutar sus consultas
reales (13-18 por pantalla, ~400-450ms en paralelo medido contra este
proyecto) más el round-trip del propio Vercel. Offline es rápido porque **no
hace el trabajo real**; no es una referencia de cuánto debería tardar con
datos frescos.

**Lo que NO se hizo, a propósito:** Next permite `experimental.staleTimes`
en `next.config.ts` para que el navegador reuse un payload reciente sin
volver a pedirlo al servidor por unos segundos. Subiría la velocidad
percibida en navegación de ida y vuelta, pero en una app de finanzas
significa poder ver un balance desactualizado justo después de registrar un
movimiento. No se activó sin decisión explícita del usuario — es un
trade-off de framework, no un bug a corregir.

## 8. El roadmap de 12 bloques (COMPLETADO)

Documento de planificación original en
`C:\Users\judit\.claude\plans\iterative-swinging-frost.md` (si el asistente
nuevo tiene acceso al filesystem local del usuario). Resumen de qué se hizo
en cada bloque:

1. Fix del asistente IA (modelo Gemini obsoleto).
2. Fix date picker iOS Safari (min/max + placeholder en `DayPicker.tsx`).
3. Jerarquía de información (Inicio, Movimientos, Presupuesto).
4. Color: neutros teal→gris + más uso de los 4 semánticos.
5. RPC transaccional `pay_debt()`/`unpay_debt()`.
6. RPC transaccional `collect_receivable()`/`uncollect_receivable()` +
   `npm run check:coherence` (script de mantenimiento, ver más abajo).
7. Import de estados de cuenta (CSV, mapeo de columnas, duplicados).
8. Multi-moneda (8b) + auto-categorización (8c) + categorías default RD (8a).
9. Reportes: toggle quincena/mes + exportar PDF (`window.print()`).
10. Detección de suscripciones no registradas + cuenta colchón.
11. Bloqueo de la app (PIN + biometría opcional).
12. PWA offline-first (cola del FAB) + push real (VAPID + cron).

**No quedan bloques pendientes del roadmap original.** Cualquier trabajo
nuevo es fuera de este plan — hay que tratarlo como una tarea nueva, no
como continuación automática del roadmap.

## 9. Script de mantenimiento: `npm run check:coherence`

`scripts/check-coherence.mjs` — dependency-free, corre por fuera del
navegador, usa `SUPABASE_SERVICE_ROLE_KEY` (bypasea RLS a propósito, nunca
se usa client-side). Hace 7 chequeos de consistencia contra el ledger real:
balances por cuenta, espejos de gasto/sueldo/cobro, movimientos huérfanos,
totales de deuda. Exit code 0/1. Ya encontró y ayudó a arreglar un bug real
en producción (6 pagos de deuda sin su gasto espejo, por un
`Promise.all` que no revisaba `.error` de cada insert — patrón de bug ya
corregido en todos los sitios conocidos, pero vale la pena tenerlo en
mente al escribir código nuevo con inserts paralelos).

## 10. Variables de entorno

Ver `.env.local.example` para la lista completa comentada. Resumen:

| Variable | Dónde se usa | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Todo el cliente/servidor | Requeridas |
| `GEMINI_API_KEY` | Asistente IA | Opcional, vacío = asistente desactivado |
| `SUPABASE_SERVICE_ROLE_KEY` | `check:coherence` + cron de push | Bypasea RLS, nunca `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Push real (Bloque 12) | Generadas con `web-push.generateVAPIDKeys()` |
| `CRON_SECRET` | Protege `/api/cron/daily-alerts` | Vercel Cron lo manda solo en el header si la variable existe en el proyecto |

Los valores reales viven en `.env.local` (gitignored) y deben agregarse
también en Vercel → Settings → Environment Variables para que funcionen en
producción (un `.env.local` local NO se sube ni se lee en Vercel).

## 11. Limitaciones conocidas / sin probar de extremo a extremo

El entorno de desarrollo de Claude Code usado hasta ahora **no tiene**:
sesión de login real (no se pueden probar flujos autenticados en
navegador), hardware biométrico real (WebAuthn se probó solo hasta
`isUserVerifyingPlatformAuthenticatorAvailable()`; `credentials.create()`
se queda esperando una interacción real que el entorno no puede dar), un
navegador iOS Safari real, ni un despliegue HTTPS real para probar push de
extremo a extremo con Service Worker activo. Todo lo de esos bloques se
verificó por lógica (pruebas unitarias ad-hoc con Node), por build/lint
limpios, y por llamadas directas a los API routes reales cuando fue
posible (ver Bloque 12: así se encontró y corrigió un bug real de
middleware que habría roto el cron en producción).

**Recomendación para quien continúe:** cualquier feature nueva que toque
flujos autenticados, biometría, o push, debería idealmente verificarse en
un dispositivo real del usuario antes de darla por buena del todo.

## 12. Cómo se ha estado trabajando (convenciones de colaboración)

- **Un commit atómico por bloque/tarea**, mensaje descriptivo en español
  explicando qué cambió y por qué (no solo qué), con pendientes
  explícitos al final si aplica (migraciones sin correr, cosas sin
  probar).
- **Antes de cada commit:** `npm run build` + `npm run lint` limpios, y
  verificación en navegador (dev server local vía las herramientas de
  preview) cuando el cambio es observable — revisando consola y logs del
  servidor.
- **No parchear a ciegas** — diagnosticar con evidencia (leer el código
  real, no asumir) antes de proponer un fix.
- **Preguntar antes de acciones destructivas** o que muten datos
  financieros reales de producción.
- **Comentarios en el código**: solo cuando explican un PORQUÉ no obvio
  (una restricción oculta, un bug que se está evitando, una decisión de
  arquitectura) — nunca describir QUÉ hace el código si el nombre ya lo
  dice. Sin emojis en ningún lado del código ni la UI salvo que se pida
  explícitamente.
- **Push a `main` = deploy a producción inmediato** — no hay rama de
  staging en el flujo actual, así que cada push importa.

## 13. Ideas no implementadas / posibles próximos pasos

Estas son cosas mencionadas en el diagnóstico original pero fuera de
alcance de los 12 bloques, o explícitamente marcadas "fuera de alcance":

- **Colaboración multiusuario** (vista/permisos por miembro del hogar) —
  requeriría decidir primero si Cachin' sigue siendo single-user o se
  vuelve multi-tenant, un cambio de modelo de datos grande.
- **Import de OFX/PDF de bancos** (hoy solo CSV).
- **Cola offline-first extendida** a más formularios además de los 3 del
  FAB (decisión de alcance del Bloque 12, no una limitación técnica dura).
- **Verificación real en iOS Safari / dispositivo con biometría** — ver
  sección 11.
- Cualquier ajuste de UI/UX que el usuario pida sobre la marcha (el
  proyecto ya pasó por varias rondas de rediseño visual — el sistema de
  diseño en `components/ui/` y `app/globals.css` está maduro y se debe
  reusar, no reinventar, para cambios nuevos).

---

*Generado a partir del historial completo de trabajo en este proyecto. Si
algo acá no coincide con el estado real del código, el código manda —
verificar antes de asumir que este documento sigue 100% vigente.*
