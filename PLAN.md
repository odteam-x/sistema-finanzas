# PLAN.md — Ajustes Cachín: consolidación del ledger, deudas/cobros/préstamos, UX transversal

## Contexto

"Cachin'" es la PWA de finanzas personales que se ha venido construyendo en fases previas (Next.js 16 + Supabase, RLS, single-user, RD$, TZ `America/Santo_Domingo`). El usuario reporta un problema transversal: **secciones que no se enteran de los cambios de otras** (pagar una deuda no baja el balance, retirar de un ahorro no aparece en Movimientos, una meta no refleja el pago de una deuda vinculada). Entregó una spec detallada (R01–R16) con un modelo conceptual ideal (una tabla `movements` única, todo derivado, todo transaccional) y pidió **solo este documento** en esta vuelta — nada de código todavía.

Se hizo una auditoría completa del código actual (3 agentes de exploración, lectura íntegra de cada archivo relevante) contra cada requerimiento, **sin asumir que las premisas de la spec son ciertas**. Tres decisiones de arquitectura ya fueron confirmadas por el usuario vía preguntas directas (ver §2). El resto de las decisiones quedan documentadas en §7 para su aprobación junto con el resto del plan.

---

## 1. Modelo conceptual — confirmado y corregido

La semántica del usuario (Cuenta / Movimiento / Deuda / Cobro / Ahorro / Meta) es correcta y se adopta, **con dos adiciones** pedidas explícitamente por el usuario esta ronda:

- **Cobro**: dinero que me deben (ya existía en la spec original).
- **Préstamo**: dinero que YO le presto a alguien más — pedido nuevo del usuario, se modela junto a Cobros (ver Bloque I).

Confirmado por auditoría: hoy el modelo real es **3 tablas de dinero, no 1**:
- `savings_movements` — el ledger real de cuentas (`deposito`/`retiro`), con `source`/`source_ref_id` polimórfico.
- `expenses` — gasto de la quincena/presupuesto (desde migration-v8 también recibe pagos de deuda, con su propio `source`/`source_ref_id`).
- `salaries` — ingresos, con `confirmed` (desde migration-v7) para no acreditar un sueldo hasta confirmarlo.

`debts`/`debt_installments` son compromisos (no dinero) — coincide con el modelo del usuario. `goals` tiene `current_amount` que se sobreescribe en lectura cuando hay una `savings_accounts.goal_id` vinculada (progreso derivado del ledger).

---

## 2. Decisiones ya confirmadas por el usuario

| # | Pregunta | Decisión |
|---|---|---|
| D1 | ¿Fusionar las 3 tablas en una `movements` única, o mantenerlas y unificar solo el cálculo? | **Mantener las 3 tablas.** Se elimina la duplicación real (cálculo de balance repetido en 3 archivos, escrituras no atómicas) con vistas SQL y funciones RPC transaccionales — sin fusionar schema. |
| D2 | ¿Construir "Cobros" (R10) desde cero? | **Sí**, y además el usuario pidió agregar un apartado nuevo de **Préstamos** (dinero que él presta a otros). Ver Bloque I. |
| D3 | ¿Migrar dinero a enteros de centavos? | **No.** `numeric(12,2)` en Postgres ya es decimal exacto (no es float) — el riesgo real está en JS al sumar con `Number()`. Se blinda el cálculo en una capa de helpers, sin tocar las 13 columnas de dinero. |

---

## 3. Auditoría por bloque (hallazgos)

### Bloque A — Deudas

**R01 (deudas no deben afectar el flujo de caja) — YA SE CUMPLE hoy.**
Auditoría confirma: `addDebt()` (`app/(app)/deudas/actions.ts:94-168`) solo inserta en `debts`/`debt_installments`, cero escritura a `savings_movements`/`expenses`. Solo `recordDebtPayment()` (pago/abono) escribe dinero real, y ya escribe a AMBAS tablas (`savings_movements` retiro + `expenses` con `source='debt_payment'`) — esto se corrigió en una fase anterior de este mismo proyecto (migration-v8). **No hay migración de neutralización pendiente** — no existe el bug que la spec asume. Se deja como regresión cubierta por el test de coherencia (§8), no como trabajo nuevo.

**R02 (botón + para incrementar deuda) — NO EXISTE.**
`updateDebt()` (`actions.ts:172-192`) permite editar `total_amount` directamente (sobreescribir), no hay tabla `debt_increments` ni historial de incrementos. Trabajo nuevo: tabla + UI + cálculo `monto_inicial + Σ incrementos`.

**R03 (deudas pagadas inmutables + eliminar no devuelve dinero) — PARCIAL.**
El dinero YA no se devuelve al eliminar (confirmado: `deleteDebt()` limpia `savings_movements`+`expenses` por `source_ref_id`, no hay reversión de balance). **Falta**: bloqueo de edición cuando `saldo_pendiente = 0`, acción explícita de "reabrir", y el re-etiquetado de movimientos a `manual` con nota al eliminar una deuda pagada (hoy simplemente se borran junto con la deuda — la spec pide conservarlos re-etiquetados).

### Bloque B — Cuentas y flujo de dinero

**R08 (cuenta por defecto Efectivo, sin `cuenta_id` null) — BUG REAL CONFIRMADO.**
`savings_movements.account_id` ya es `NOT NULL` (bien). Pero `expenses.account_id` y `salaries.account_id` son **nullable**, y `getOrCreateDefaultAccountId()` (`lib/accounts.ts:21-51`) puede devolver `null` si el insert de la cuenta falla — en ese caso, `addExpense`/`addSalary` igual insertan la fila SIN su espejo en el ledger (`if (account_id) { ... }` como guardia silenciosa). Esto es exactamente la inconsistencia que preocupa al usuario. Fix: eliminar la posibilidad de `null` (la función debe garantizar una cuenta o fallar toda la operación vía RPC transaccional — no insertar a medias).

**R09 (transferencias entre cuentas propias) — NO EXISTE.**
`MovementKind` es solo `"deposito" | "retiro"` (`lib/types.ts:137`). Mover dinero entre dos cuentas propias hoy requiere dos operaciones manuales sin vínculo ni atomicidad. Se adopta la preferencia del usuario: nuevo `kind = "transferencia"`, no infla ingresos/egresos totales.

**R10 (cobros con cuenta destino) — NO EXISTE NADA.** Confirmado por grep exhaustivo: cero tabla, tipo, página o acción para dinero que le deben al usuario. Se construye desde cero — ver Bloque I.

### Bloque C — Ahorros

**R04 (editar/retirar ahorros) — PARCIAL.**
Depositar/Retirar YA existen para cuentas `ahorro` (en `/balance` y en `/metas`). **Falta**: Editar y Eliminar una cuenta de ahorro **desde la pantalla de Ahorros** (`/metas`) — hoy solo están disponibles desde `/balance`, aunque la cuenta sea la misma. Es un gap de UI, no de datos (las acciones `updateAccount`/`deleteAccount` ya existen, solo falta exponerlas en esa pantalla).

**R11 (ahorro fuera de "Balance actual") — INVERTIDO respecto a lo que el usuario cree.**
Hallazgo importante: la tarjeta que hoy dice "Balance actual" (`components/ui/BalanceHero.tsx`) en realidad muestra `savingsTotal`, que **suma TODAS las cuentas sin filtrar por tipo — sí incluye ahorros**. Es decir, hoy existe una sola tarjeta y es la que la spec llama "Balance total". No existe hoy ninguna tarjeta de una sola cuenta. Confirma R12 tal cual.

### Bloque D — Inicio

**R05 (eliminar "Disponible esta quincena") — decisión con matiz, ver §7-D1.**
`AvailableHero` + `saldoReal` (`lib/summary.ts`) existen y se construyeron en una fase anterior de este mismo proyecto específicamente para corregir un bug de cálculo que el usuario reportó. Ese mismo componente hoy también aloja el flujo de "confirmar que llegó el sueldo" (`pendingSalary`/`confirmSalary`) antes de contar el ingreso. Eliminar el hero completo sin más se llevaría ese flujo de confirmación. Ver decisión propuesta en §7.

**R12 (Balance actual de una cuenta + Balance total separado) — confirmado gap real, ver Bloque C R11.**

### Bloque E — Movimientos

**R06 — PARCIAL.** Hoy SÍ se filtra en la query (`getSavingsMovements(from, to)` usa `.gte`/`.lte`), pero los TOTALES (neto, agrupación) se calculan con `.reduce()`/`.filter()` en JS sobre las filas ya traídas — no hay `SUM` de SQL ni RPC. No existe selector de día específico (solo presets `todo/mes/3m`). No existe "día con más movimientos" en ningún lado. No hay total de ingresos ni egresos por separado, solo el neto.

### Bloque F — Presupuesto

**R07 — YA SE CUMPLE en gran parte.** `/calculadoras` (`GoalCalculator`, `LoanCalculator`) ya es 100% independiente del límite mensual — no lee ni escribe `budget_categories`. Falta agregar la calculadora específica "monto ÷ días = gasto por día" que no existe todavía como herramienta explícita, con su botón separado "Aplicar a mi presupuesto".

**R13 — el override de días YA EXISTE pero es más simple que lo pedido.** `budget_period_overrides` (`user_id, period_key, workdays`) permite **escribir un número** en vez de confiar en el conteo automático — no permite elegir un rango de fechas o días específicos en un calendario. Es un override del *resultado*, no un modo alternativo de *cálculo*. Falta: Modo A/B explícito + calendario multi-selección + persistencia del conjunto de días (no solo un conteo).

### Bloque G — Metas

**R14 — NO EXISTE ningún vínculo meta↔deuda.** El único vínculo hoy es cuenta↔meta (`savings_accounts.goal_id`), con el mismo patrón de "progreso derivado" que se puede replicar 1:1 para deuda↔meta (`debts.goal_id`).

### Bloque H — UX global

**R15 — NO EXISTE NADA de esto.** Cero `deleted_at` en las 14 tablas del schema, cero componente de toast/undo en `components/`, 9 archivos con `.delete()` físico directo. Es, con diferencia, **el requerimiento de mayor alcance/riesgo de todo el documento** (toca las 14 tablas, 9 Server Actions, cada RLS policy, cada query de lectura). Ver fase propuesta en §7.

**R16 — no hay sistema de tokens de tipografía hoy.** Solo `.text-money-sm/md/lg` (clamp, ya afinados 2 veces en fases anteriores) son tokens compartidos. Todo lo demás usa la escala default de Tailwind (`text-sm`, `text-xl`...) directamente, sin token intermedio — **buena noticia**: Tailwind v4 permite redefinir esa escala default entera en `@theme` (`--text-sm`, `--text-base`, etc.), lo que propaga automáticamente a ~53 archivos sin tocarlos uno por uno. Solo ~5-10 sitios con valores arbitrarios (`text-[0.68rem]`, botón "md", tabs) quedan fuera y necesitan edición manual.

### Bloque I — Cobros y Préstamos (NUEVO, pedido esta ronda)

No existe absolutamente nada de esto hoy (tabla, tipo, página, nav). Se construye como una sección hermana de Deudas, con el mismo patrón (pago único / cuotas, incrementos, estado inmutable al liquidar) pero invertida: el dinero entra cuando se recibe/cobra, no sale. "Préstamos" (dinero que el usuario presta a terceros) se modela como el mismo concepto de "Cobro" con una etiqueta de origen distinta, para no duplicar toda la lógica de pagos/estados dos veces — una tabla, un `kind` (`'cobro' | 'prestamo'`), una pantalla con dos vistas/tabs. Se detalla el schema en §5.

---

## 4. Auditoría de duplicación (pedida en la regla 1-bis)

| Dato | Dónde se calcula hoy | Acción |
|---|---|---|
| Balance de una cuenta (`balanceOfAccount`) | `lib/summary.ts:118-121`, `app/(app)/balance/page.tsx:121-124` (`balanceOf`), `app/(app)/metas/page.tsx:75-83` (`balanceOfAccount`, closure separada) | Colapsar a **una vista SQL** `v_account_balances`; las 3 páginas pasan a `select` de la vista. |
| Neto de movimientos filtrados | `app/(app)/movimientos/page.tsx:108` (4ta reimplementación del mismo patrón deposito/retiro) | Reemplazar por RPC `get_movement_stats(...)` (ver R06). |
| Progreso de meta | `lib/summary.ts:268-276` y `app/(app)/metas/page.tsx:75-83` (misma lógica, dos closures) | Colapsar a vista `v_goal_progress` (y extenderla para incluir deudas vinculadas, R14). |
| Estado de deuda (pendiente/pagada/parcial) | `recomputeStatus()` en `deudas/actions.ts` escribe `debts.status` como columna cacheada, recalculada a mano tras cada pago | Mantener como trigger (no como escritura manual desde la acción) o mover a `v_debt_status` calculada en lectura — ver §7-D3. |
| `account_id` nunca debe ser null | Hoy: guardia silenciosa `if (account_id)` en `addExpense`/`addSalary`, permite fila sin espejo | Eliminar la posibilidad vía RPC transaccional (todo o nada). |

**Relaciones sin FK real hoy**: `source_ref_id` (en `savings_movements` y `expenses`) es un `uuid` suelto, **sin constraint** — no apunta con FK a `debts`/`debt_installments`/`salaries`/`goals`. Se deja así a propósito (es polimórfico, un FK real necesitaría una tabla separada por tipo o `CHECK` condicional complejo) — se documenta como decisión aceptada, no como bug, salvo que el usuario prefiera lo contrario (§7-D4).

---

## 5. Schema propuesto (SQL, sin ejecutar — `migration-v9.sql` en adelante)

Aditivo, idempotente (`if not exists` / `create or replace`), con backfill explícito donde aplica. Se muestra resumido por concepto — el archivo real por fase tendrá el `-- down` documentado para cada `alter table`.

```sql
-- ===== Fase 1: núcleo del ledger =====

-- R08: eliminar la posibilidad de account_id null en expenses/salaries
-- (requiere backfill primero: asignar Efectivo a las filas NULL existentes)
update public.expenses set account_id = (
  select id from public.savings_accounts
  where user_id = expenses.user_id and is_default = true limit 1
) where account_id is null;
-- (repetir para salaries)
alter table public.expenses alter column account_id set not null;
alter table public.salaries alter column account_id set not null;

-- R09: transferencias entre cuentas propias (forma exacta pendiente, ver §7-D2)

-- Vistas de solo-lectura (elimina las 4 reimplementaciones de §4)
create or replace view public.v_account_balances as
  select account_id, user_id,
         sum(case when kind = 'deposito' then amount else -amount end) as balance
  from public.savings_movements
  group by account_id, user_id;

create or replace view public.v_goal_progress as
  select g.id as goal_id, g.user_id,
         g.current_amount
           + coalesce((select vab.balance from public.savings_accounts sa
                       join public.v_account_balances vab on vab.account_id = sa.id
                       where sa.goal_id = g.id), 0)
           + coalesce((select sum(m.amount) from public.savings_movements m
                       join public.debts d on d.id = m.source_ref_id
                       where m.source = 'debt_payment' and d.goal_id = g.id), 0)
         as progreso
  from public.goals g;

-- ===== Fase RPC (funciones transaccionales, reemplazan Promise.all de inserts sueltos) =====
create or replace function public.pay_debt(...)
returns void language plpgsql security invoker as $$
begin
  -- inserta savings_movements + expenses + update debt_installments/debts en UNA transacción
end; $$;

-- ===== Bloque A: incrementos de deuda (R02) =====
create table if not exists public.debt_increments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

-- ===== Bloque G: metas ↔ deudas (R14) =====
alter table public.debts add column if not exists goal_id uuid references public.goals(id) on delete set null;

-- ===== Bloque I: Cobros y Préstamos (NUEVO) =====
create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('cobro', 'prestamo')),
  name text not null, -- a quién le cobro / a quién le presté
  total_amount numeric(12,2) not null,
  acquired_date date not null,
  payment_type text not null check (payment_type in ('unico', 'cuotas')),
  due_date date,
  installments_count int,
  installment_amount numeric(12,2),
  frequency text,
  status text not null default 'pendiente' check (status in ('pendiente', 'parcial', 'cobrada')),
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.receivable_installments (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references public.receivables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seq int not null,
  due_date date not null,
  amount numeric(12,2) not null,
  paid boolean not null default false,
  paid_date date
);
-- source en savings_movements gana 'receivable_collected' al enum existente

-- ===== Bloque H: soft delete (R15) — el de mayor alcance, ver §7-D5 =====
alter table public.savings_movements add column if not exists deleted_at timestamptz;
alter table public.expenses add column if not exists deleted_at timestamptz;
-- ... resto de tablas en fases sucesivas.
-- CADA query de lectura existente (getExpenses, getSalaries, getSavingsMovements...)
-- gana `.is("deleted_at", null)`.
```

---

## 6. Orden de ejecución (validado, con un cambio sobre la tabla original)

Se inserta **Bloque I (Cobros/Préstamos) como Fase 3**, justo después de que Deudas quede estable — comparten patrón casi idéntico, conviene construirlos con el molde ya probado, no al final.

| Fase | Contenido | Por qué en ese orden |
|---|---|---|
| 1 | R01 (verificación, ya cumplido) + R08 + R09 + vistas SQL + primeras funciones RPC | Corrige el núcleo y elimina la duplicación de cálculo antes de construir nada encima. |
| 2 | R02, R03, R04 | Reglas de dominio de Deudas y Ahorros, ya con el ledger confiable. |
| 3 | **Bloque I — Cobros y Préstamos** (nuevo) | Mismo molde que Deudas, recién estabilizado. |
| 4 | R05 (con el matiz de §7-D1), R11, R12 | Inicio, ya con datos y cuentas correctos detrás. |
| 5 | R06 | Filtros y agregaciones de Movimientos (RPC de estadísticas). |
| 6 | R07, R13 | Presupuesto. |
| 7 | R14 | Metas ↔ deudas (depende de que deudas y metas ya estén estables). |
| 8 | R15 | Soft delete + undo — el más transversal, va después de que todas las entidades que toca ya estén en su forma final. |
| 9 | R16 | Capa de tokens de tipografía — puramente visual, puede ir en paralelo si se prefiere. |

---

## 7. Riesgos y decisiones que necesito que confirmes (D1–D7)

- **D1 (R05)**: ¿Elimino `AvailableHero`/"Disponible esta quincena" por completo, incluyendo el flujo de "¿ya te llegó tu pago?" (`pendingSalary`/`confirmSalary`), o mantengo SOLO ese aviso de confirmación de sueldo (como banner chico, no como card protagonista) y elimino nada más el número de "disponible"? Recomendación: mantener la confirmación (evita contar dinero que no ha llegado) como banner chico.
- **D2 (R09)**: para transferencias, ¿un solo movimiento con `kind='transferencia'` + `to_account_id` (una fila = el par), o dos filas linkeadas por un `transfer_group_id` compartido? Impacta cómo se muestran en Movimientos.
- **D3 (recomputeStatus)**: el estado de una deuda hoy se escribe como columna cacheada tras cada pago (el patrón que la regla 1-bis prohíbe). ¿Lo dejo como trigger de Postgres (sigue siendo columna, ya no lo escribe la app) o 100% calculado en lectura (`v_debt_status`, columna desaparece)? El trigger es más simple; la vista es más "pura".
- **D4 (`source_ref_id` sin FK)**: ¿lo dejo como uuid suelto sin constraint (pragmático, es polimórfico) o prefieres una tabla de auditoría con FK real por tipo de origen? Más trabajo por poco beneficio en single-user.
- **D5 (alcance de R15)**: ¿soft delete completo de una vez, o empezamos solo con las entidades de mayor impacto (movimientos, deudas, cobros/préstamos, cuentas) y dejamos presupuesto/etiquetas/suscripciones para después?
- **D6 (Cobros/Préstamos)**: una sola tabla `receivables` con `kind IN ('cobro','prestamo')`, ¿de acuerdo, o tablas separadas por si divergen en el futuro?
- **D7 (RPC seguridad)**: primera función de Postgres del proyecto. Uso `security invoker` (respeta RLS de quien llama, requiere PG 15+ que Supabase ya provee) — avisa si tu proyecto es más viejo.

---

## 8. Test de coherencia (regla 1-bis, punto 8)

Script ejecutable (`npm run check:coherence`) que valida, para el usuario autenticado:
1. `Σ savings_movements por cuenta == v_account_balances`.
2. `Σ savings_movements con source='debt_payment' por deuda == total abonado mostrado`.
3. `v_goal_progress == aportes directos + Σ pagos de deudas vinculadas` por meta.
4. Cero filas en `expenses`/`salaries` con `account_id` inconsistente con su movimiento espejo (detecta el bug de R08 si reaparece).

Corre en cada fase antes de darla por terminada.

---

## 9. Estimación de esfuerzo relativo

| Fase | Esfuerzo | Motivo |
|---|---|---|
| 1 (núcleo ledger + vistas + RPC) | **Alto** | Primeras RPC del proyecto, backfill de `account_id`, vistas que reemplazan 4 sitios de cálculo. |
| 2 (Deudas/Ahorros reglas) | Medio | Mayormente UI + tabla nueva (`debt_increments`). |
| 3 (Cobros/Préstamos) | **Alto** | Feature nueva completa: tabla, RLS, página, acciones, nav, tarjetas de Inicio. |
| 4 (Inicio) | Bajo-Medio | Depende de D1; si se conserva el banner, es solo reordenar UI. |
| 5 (Movimientos R06) | Medio | RPC de agregación nueva + selector de día. |
| 6 (Presupuesto R07/R13) | Medio | Calendario multi-selección es la pieza más nueva. |
| 7 (Metas↔Deudas R14) | Bajo-Medio | Mismo patrón que cuenta↔meta ya existente. |
| 8 (Soft delete R15) | **Muy alto** | Toca cada tabla, acción, query, política RLS + componente Toast/undo nuevo. |
| 9 (Escala tipográfica R16) | Bajo | Tokens en `@theme` propagan solo; ~5-10 sitios arbitrarios manuales. |

---

## 10. Mapeo de criterios de aceptación → fase

#1-#4 → Fase 1-2 · #5 → Fase 1 · #6 → Fase 1 · #7 → Fase 4 · #8 → Fase 5 · #9 → Fase 6 · #10 → Fase 7 · #11 → Fase 8. Cada uno se reporta explícitamente probado (no "debería funcionar") al cierre de su fase, con el test de coherencia (§8) en verde.

---

## Próximo paso

Este documento es el entregable de esta vuelta. No se toca código hasta confirmar las decisiones de §7 (D1–D7). Con eso resuelto, la Fase 1 arranca con `migration-v9.sql` (backfill + NOT NULL + vistas) como primer commit verificable.
