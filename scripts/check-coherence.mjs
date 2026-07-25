#!/usr/bin/env node
// Test de coherencia del ledger (Fase 1.2 del plan — quedó pendiente cuando
// el Bloque 6 se redirigió a Cobros). No es una migración ni toca datos:
// solo LEE y compara, contra las reglas que ya están implementadas en el
// código (no reglas inventadas para este script):
//
//   1. v_account_balances (SQL) == suma manual de savings_movements por
//      cuenta (mismo cálculo que lib/balances.ts, reimplementado acá abajo
//      porque este script corre en Node plano, sin compilar TypeScript).
//   2. Todo `expenses` vivo tiene EXACTAMENTE un movimiento espejo con el
//      mismo monto (addExpense siempre crea los dos juntos — ver
//      app/(app)/presupuesto/actions.ts).
//   3. Todo movimiento source='debt_payment' tiene su expense espejo
//      (recordDebtPayment en app/(app)/deudas/actions.ts).
//   4. `salaries` confirmado ⇒ exactamente 1 movimiento 'salary'; sin
//      confirmar ⇒ cero (confirmSalary en app/(app)/ingresos/actions.ts).
//   5. Cuota de cobro pagada / cobro de pago único cobrado ⇒ tiene su
//      movimiento 'receivable_collected' (collect_receivable, migration-v19).
//   6. Cero movimientos huérfanos: source_ref_id que ya no apunta a nada.
//   7. Por deuda: Σ cuotas pagadas == Σ movimientos 'debt_payment' de esa
//      deuda (mismo total que muestra la UI, ver lib/debts.ts).
//
// Uso:
//   npm run check:coherence
//
// Requiere en .env.local (o el entorno):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (Dashboard → Project Settings → API — NO es
//                                la anon key; esta bypasea RLS a propósito,
//                                es lo esperado para un script de
//                                mantenimiento que corre fuera del navegador,
//                                nunca debe llegar al bundle del cliente)
//
// Sale con código 0 si todo cuadra, 1 si encuentra algo — pensado para CI.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// .env.local no pasa por el loader de Next acá — este script corre suelto
// con `node`, así que se parsea a mano (sin dependencias nuevas).
function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Agrega SUPABASE_SERVICE_ROLE_KEY a .env.local — la sacas de\n" +
      "Supabase Dashboard → Project Settings → API → service_role.\n" +
      "(Ver .env.local.example.)",
  );
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY);
const problems = [];
const money = (n) => `RD$${Number(n).toFixed(2)}`;
// Dos montos "iguales" con margen de un centavo — numeric(12,2) en Postgres
// es exacto, pero JS suma en float; este script no debería fallar por ruido
// de punto flotante que no es un descuadre real.
const closeEnough = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;

// debt_installments y receivable_installments NO tienen deleted_at a
// propósito (migration-v15): viven y mueren con su deuda/cobro, así que no
// necesitan su propia marca de borrado suave.
const NO_SOFT_DELETE = new Set(["debt_installments", "receivable_installments"]);

async function all(table, columns = "*") {
  let q = supabase.from(table).select(columns);
  if (!NO_SOFT_DELETE.has(table)) q = q.is("deleted_at", null);
  const { data, error } = await q;
  if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Balance por cuenta: vista SQL vs. suma manual del ledger.
//    Mismo cálculo que lib/balances.ts — reimplementado acá porque este
//    script no compila TypeScript.
// ─────────────────────────────────────────────────────────────────────────
async function checkAccountBalances() {
  const [accounts, movements, view] = await Promise.all([
    all("savings_accounts", "id, name"),
    all("savings_movements", "account_id, to_account_id, kind, amount"),
    supabase.from("v_account_balances").select("account_id, balance"),
  ]);
  if (view.error) {
    problems.push(`v_account_balances no se pudo leer: ${view.error.message} (¿corriste migration-v9/v17?)`);
    return;
  }
  const viewBy = new Map(view.data.map((r) => [r.account_id, Number(r.balance)]));

  for (const acc of accounts) {
    let manual = 0;
    for (const m of movements) {
      const amt = Number(m.amount);
      if (m.kind === "transferencia") {
        if (m.account_id === acc.id) manual -= amt;
        if (m.to_account_id === acc.id) manual += amt;
      } else if (m.account_id === acc.id) {
        manual += m.kind === "deposito" ? amt : -amt;
      }
    }
    const fromView = viewBy.get(acc.id) ?? 0;
    if (!closeEnough(manual, fromView)) {
      problems.push(
        `Cuenta "${acc.name}": v_account_balances dice ${money(fromView)} pero el ledger suma ${money(manual)}.`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2 y 3. Gastos ↔ movimientos espejo (1 a 1, ambos sentidos).
//
// OJO — dos convenciones DISTINTAS de source_ref_id conviven en el código:
//   · Gasto manual (addExpense, presupuesto/actions.ts): el MOVIMIENTO
//     apunta al gasto (movement.source_ref_id === expense.id) — padre-hijo.
//   · Pago de deuda (recordDebtPayment, deudas/actions.ts): el gasto Y el
//     movimiento son HERMANOS — los dos reciben el mismo source_ref_id, que
//     es el id de la CUOTA (o de la deuda, si es pago único), no el id del
//     otro. Cruzar movement.source_ref_id contra expense.id acá SIEMPRE da
//     "no encontrado", aunque el par exista y esté perfecto — confundir
//     esto una vez ya generó 6 falsos positivos en este mismo script.
// ─────────────────────────────────────────────────────────────────────────
async function checkExpenseMirrors() {
  const [expenses, movements] = await Promise.all([
    all("expenses", "id, amount, note, source, source_ref_id"),
    all("savings_movements", "id, amount, source, source_ref_id"),
  ]);

  // --- Gastos "padre-hijo" (todo lo que no sea pago de deuda) ---
  const movByExpenseId = new Map();
  for (const m of movements) {
    if (m.source_ref_id) {
      (movByExpenseId.get(m.source_ref_id) ?? movByExpenseId.set(m.source_ref_id, []).get(m.source_ref_id)).push(m);
    }
  }
  for (const e of expenses.filter((e) => e.source !== "debt_payment")) {
    const mirrors = movByExpenseId.get(e.id) ?? [];
    if (mirrors.length === 0) {
      problems.push(`Gasto "${e.note ?? e.id}" (${money(e.amount)}) no tiene movimiento espejo en el ledger.`);
    } else if (mirrors.length > 1) {
      problems.push(`Gasto "${e.note ?? e.id}" tiene ${mirrors.length} movimientos espejo (debería ser 1).`);
    } else if (!closeEnough(mirrors[0].amount, e.amount)) {
      problems.push(
        `Gasto "${e.note ?? e.id}" es ${money(e.amount)} pero su movimiento espejo es ${money(mirrors[0].amount)}.`,
      );
    }
  }

  // --- Pagos de deuda "hermanos" (agrupados por la cuota/deuda que pagan) ---
  const debtExpenses = expenses.filter((e) => e.source === "debt_payment");
  const debtMovements = movements.filter((m) => m.source === "debt_payment");
  const refIds = new Set([
    ...debtExpenses.map((e) => e.source_ref_id).filter(Boolean),
    ...debtMovements.map((m) => m.source_ref_id).filter(Boolean),
  ]);
  for (const refId of refIds) {
    const es = debtExpenses.filter((e) => e.source_ref_id === refId);
    const ms = debtMovements.filter((m) => m.source_ref_id === refId);
    if (es.length === 0) {
      problems.push(`Pago de deuda (cuota/deuda ${refId}, ${money(ms[0]?.amount ?? 0)}) no tiene gasto espejo.`);
    } else if (ms.length === 0) {
      problems.push(`Pago de deuda (cuota/deuda ${refId}, ${money(es[0]?.amount ?? 0)}) no tiene movimiento espejo.`);
    } else if (es.length > 1 || ms.length > 1) {
      problems.push(`Pago de deuda (cuota/deuda ${refId}) tiene ${es.length} gasto(s) y ${ms.length} movimiento(s) — debería ser 1 y 1.`);
    } else if (!closeEnough(es[0].amount, ms[0].amount)) {
      problems.push(
        `Pago de deuda (cuota/deuda ${refId}): el gasto es ${money(es[0].amount)} pero el movimiento es ${money(ms[0].amount)}.`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Sueldos: confirmado ⇒ 1 movimiento; sin confirmar ⇒ 0.
// ─────────────────────────────────────────────────────────────────────────
async function checkSalaryMirrors() {
  const [salaries, movements] = await Promise.all([
    all("salaries", "id, amount, confirmed, pay_date"),
    all("savings_movements", "amount, source, source_ref_id").then((rows) =>
      rows.filter((m) => m.source === "salary"),
    ),
  ]);
  const movByRef = new Map(movements.map((m) => [m.source_ref_id, m]));

  for (const s of salaries) {
    const mirror = movByRef.get(s.id);
    if (s.confirmed && !mirror) {
      problems.push(`Sueldo confirmado del ${s.pay_date} (${money(s.amount)}) no tiene movimiento en el ledger.`);
    } else if (s.confirmed && mirror && !closeEnough(mirror.amount, s.amount)) {
      problems.push(
        `Sueldo del ${s.pay_date} es ${money(s.amount)} pero su movimiento es ${money(mirror.amount)}.`,
      );
    } else if (!s.confirmed && mirror) {
      problems.push(
        `Sueldo del ${s.pay_date} SIN confirmar ya tiene un movimiento en el ledger (se estaría contando dinero que no ha llegado).`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Cobros: cuota/registro cobrado ⇒ tiene su movimiento 'receivable_collected'.
// ─────────────────────────────────────────────────────────────────────────
async function checkReceivableMirrors() {
  const [receivables, installments, movements] = await Promise.all([
    all("receivables", "id, name, status, total_amount, payment_type"),
    all("receivable_installments", "id, receivable_id, amount, paid"),
    all("savings_movements", "amount, source, source_ref_id").then((rows) =>
      rows.filter((m) => m.source === "receivable_collected"),
    ),
  ]);
  const movByRef = new Map(movements.map((m) => [m.source_ref_id, m]));

  for (const r of receivables) {
    if (r.payment_type !== "unico") continue;
    const mirror = movByRef.get(r.id);
    if (r.status === "cobrada" && !mirror) {
      problems.push(`Cobro "${r.name}" (${money(r.total_amount)}) está marcado cobrado pero no tiene movimiento.`);
    } else if (r.status !== "cobrada" && mirror) {
      problems.push(`Cobro "${r.name}" tiene un movimiento en el ledger pero su estado NO es "cobrada".`);
    }
  }
  for (const i of installments) {
    const mirror = movByRef.get(i.id);
    const rec = receivables.find((r) => r.id === i.receivable_id);
    const label = rec?.name ?? i.receivable_id;
    if (i.paid && !mirror) {
      problems.push(`Cuota de cobro de "${label}" (${money(i.amount)}) está marcada pagada pero no tiene movimiento.`);
    } else if (!i.paid && mirror) {
      problems.push(`Cuota de cobro de "${label}" tiene un movimiento pero NO está marcada como pagada.`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Movimientos huérfanos: source_ref_id que ya no apunta a nada vivo.
// ─────────────────────────────────────────────────────────────────────────
async function checkOrphanMovements() {
  const movements = await all("savings_movements", "id, amount, source, source_ref_id");
  const targets = {
    // debt_payment: source_ref_id es la CUOTA o la DEUDA que se pagó (ver
    // recordDebtPayment en deudas/actions.ts) — NO el gasto espejo, ese es
    // un hermano, no el destino (ver nota larga en checkExpenseMirrors).
    debt_payment: new Set([
      ...(await all("debts", "id")).map((r) => r.id),
      ...(await all("debt_installments", "id")).map((r) => r.id),
    ]),
    salary: new Set((await all("salaries", "id")).map((r) => r.id)),
    receivable_collected: new Set([
      ...(await all("receivables", "id")).map((r) => r.id),
      ...(await all("receivable_installments", "id")).map((r) => r.id),
    ]),
  };
  for (const m of movements) {
    const known = targets[m.source];
    if (known && m.source_ref_id && !known.has(m.source_ref_id)) {
      problems.push(
        `Movimiento huérfano: ${money(m.amount)}, source="${m.source}", apunta a un id que ya no existe (${m.source_ref_id}).`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Por deuda: Σ cuotas pagadas == Σ movimientos 'debt_payment' de esa deuda.
// ─────────────────────────────────────────────────────────────────────────
async function checkDebtTotals() {
  const [debts, installments, expenses] = await Promise.all([
    all("debts", "id, name, payment_type, total_amount, status"),
    all("debt_installments", "id, debt_id, amount, paid"),
    all("expenses", "id, amount, source, source_ref_id"),
  ]);
  // El gasto de una cuota de deuda NO tiene su propio id igual al de la
  // cuota — comparte source_ref_id CON la cuota (son hermanos, ver la nota
  // larga en checkExpenseMirrors). Se agrupa por source_ref_id, no por id.
  const expenseAmountByRef = new Map(
    expenses.filter((e) => e.source === "debt_payment").map((e) => [e.source_ref_id, Number(e.amount)]),
  );

  for (const d of debts) {
    if (d.payment_type !== "cuotas") continue;
    const own = installments.filter((i) => i.debt_id === d.id);
    const paidTotal = own.filter((i) => i.paid).reduce((s, i) => s + Number(i.amount), 0);
    // El gasto espejo de cada cuota pagada es lo que de verdad cuenta como
    // "salió de tu bolsillo" — se compara contra ESO, no contra
    // installments.amount de nuevo (sería comparar la fuente contra sí
    // misma).
    const ledgerTotal = own
      .filter((i) => i.paid)
      .reduce((s, i) => s + (expenseAmountByRef.get(i.id) ?? 0), 0);
    if (!closeEnough(paidTotal, ledgerTotal)) {
      problems.push(
        `Deuda "${d.name}": las cuotas pagadas suman ${money(paidTotal)} pero el ledger solo registra ${money(ledgerTotal)}.`,
      );
    }
  }
}

const checks = [
  ["Balance por cuenta", checkAccountBalances],
  ["Gastos ↔ ledger", checkExpenseMirrors],
  ["Sueldos ↔ ledger", checkSalaryMirrors],
  ["Cobros ↔ ledger", checkReceivableMirrors],
  ["Movimientos huérfanos", checkOrphanMovements],
  ["Totales de deudas en cuotas", checkDebtTotals],
];

console.log("Verificando coherencia del ledger…\n");
for (const [label, fn] of checks) {
  const before = problems.length;
  try {
    await fn();
  } catch (err) {
    problems.push(`${label}: error al verificar — ${err.message}`);
  }
  console.log(`  ${problems.length === before ? "✓" : "✗"} ${label}`);
}

console.log("");
if (problems.length > 0) {
  console.error(`❌ ${problems.length} incoherencia(s) encontrada(s):\n`);
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}
console.log("✅ Todo cuadra.");
process.exit(0);
