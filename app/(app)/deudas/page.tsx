import Link from "next/link";
import {
  getCreditors,
  getDebtIncrements,
  getDebts,
  getInstallments,
  getSavingsAccounts,
} from "@/lib/data";
import { groupDebts, isSettled, outstandingOfDebt } from "@/lib/debts";
import { formatDateShort, todayISO, daysBetween } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { AddDebtForm } from "./AddDebtForm";
import { DebtGroupCard } from "./DebtGroupCard";

export const metadata = { title: "Deudas · Cachin'" };

export default async function DeudasPage() {
  const today = todayISO();
  const [debts, installments, accounts, increments, creditors] = await Promise.all([
    getDebts(),
    getInstallments(),
    getSavingsAccounts(),
    getDebtIncrements(),
    getCreditors(),
  ]);

  const byDebt = new Map<string, typeof installments>();
  for (const i of installments) {
    const arr = byDebt.get(i.debt_id) ?? [];
    arr.push(i);
    byDebt.set(i.debt_id, arr);
  }

  // Total/abonado/pendiente salen de lib/debts.ts — una sola implementación
  // compartida con el resto de la app (antes cada pantalla lo sumaba aparte).
  const isPaid = (d: (typeof debts)[number]) => isSettled(d, installments, increments);

  // Las saldadas se van a /deudas/historial: mezcladas acá, cada una ocupaba
  // una tarjeta entera con badge "Solo lectura" y empujaba hacia abajo lo
  // único accionable de la pantalla — lo que todavía debes.
  const active = debts.filter((d) => !isPaid(d));
  const settledCount = debts.length - active.length;

  // Total adeudado + próximo vencimiento
  const outstanding = active.reduce((s, d) => s + outstandingOfDebt(d, installments, increments), 0);
  const upcoming: string[] = [];
  for (const d of active) {
    if (d.payment_type === "cuotas") {
      for (const i of byDebt.get(d.id) ?? []) {
        if (!i.paid) upcoming.push(i.due_date);
      }
    } else if (d.due_date) {
      upcoming.push(d.due_date);
    }
  }
  upcoming.sort();
  const nextDue = upcoming[0] ?? null;

  const groups = groupDebts(active, creditors);

  return (
    <>
      <PageHeader
        title="Deudas"
        subtitle="Acreedores, cuotas y vencimientos"
        action={<AddDebtForm compact accounts={accounts} creditors={creditors} />}
      />

      {/* "Total adeudado" competía con una FECHA del mismo peso tipográfico
          en el tile de al lado: un monto y un día se leían como igual de
          importantes. El monto manda a ancho completo; el vencimiento pasa a
          contexto. */}
      <div className="mb-5 flex flex-col gap-2.5">
        {/* Deudas era la única de las cinco secciones con tono propio que
            seguía sin hero: su cifra iba en un StatTile `hero`, que es una
            tarjeta de superficie, mientras Ingresos, Metas, Reportes y
            Calculadora abrían con el bloque saturado. Ahora abre igual, en
            terracota — un rojo apagado, no de alarma: deber dinero no es una
            emergencia, y el rojo de peligro se reserva para lo vencido.
            El de logro sigue prohibido en esta pantalla. */}
        <div className="tone-deudas bg-gradient-brand rounded-card p-4 sm:p-5 flex items-center justify-between gap-3 overflow-hidden shadow-hero">
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-brand-muted">Total adeudado</p>
            <MoneyValue
              value={outstanding}
              decimals={false}
              className="block money-lg font-extrabold text-on-brand mt-1"
            />
          </div>
          <span className="grid place-items-center size-14 rounded-pill bg-on-brand-well text-on-brand shrink-0">
            <Icon name="debt" size={28} />
          </span>
        </div>
        <StatTile
          emphasis="quiet"
          label="Próximo vencimiento"
          value={nextDue ? formatDateShort(nextDue) : "—"}
          sub={
            nextDue
              ? (() => {
                  const d = daysBetween(today, nextDue);
                  return d < 0 ? "vencido" : d === 0 ? "hoy" : `en ${d} días`;
                })()
              : "Sin deudas activas"
          }
          icon="clock"
          tone="neutral"
        />
      </div>

      {/* En el cuerpo y no en el PageHeader: ahí ya vive el botón de registrar
          deuda, que es LA acción de esta pantalla. El historial es consulta. */}
      {settledCount > 0 && (
        <Link
          href="/deudas/historial"
          className="inline-flex items-center gap-1.5 rounded-pill border border-line-strong px-3.5 min-h-11 text-sm font-semibold text-ink hover:bg-surface-sunken transition-colors mb-5"
        >
          <Icon name="clock" size={16} />
          Historial · {settledCount} {settledCount === 1 ? "saldada" : "saldadas"}
        </Link>
      )}

      {active.length === 0 ? (
        <EmptyState
          icon="debt"
          illustration="receipt"
          title={debts.length > 0 ? "Estás al día" : "Sin deudas registradas"}
          message={
            debts.length > 0
              ? "No te queda nada pendiente. Lo que ya saldaste está en el historial."
              : "Registra una deuda para llevar control de sus pagos y vencimientos."
          }
          action={<AddDebtForm triggerLabel="Registrar deuda" accounts={accounts} creditors={creditors} />}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li key={g.key}>
              <DebtGroupCard
                name={g.name}
                debts={g.debts}
                installments={installments}
                increments={increments}
                accounts={accounts}
                creditors={creditors}
                today={today}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
