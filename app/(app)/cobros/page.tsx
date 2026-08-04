import Link from "next/link";
import {
  getReceivableInstallments,
  getReceivables,
  getSavingsAccounts,
} from "@/lib/data";
import { collectedOf, isCollected, pendingOf, totalPending } from "@/lib/receivables";
import { formatDateLong, formatDateShort, todayISO, daysBetween } from "@/lib/format";
import { RANGE_LABEL, parseRangePreset, rangeBounds, type RangePreset } from "@/lib/range";
import { hrefWith } from "@/lib/href";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { SegmentedLinks } from "@/components/ui/SegmentedLinks";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { ActiveFilters } from "@/components/ui/ActiveFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { IconBubble } from "@/components/ui/IconBubble";
import { Money } from "@/components/ui/Money";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/FormModal";
import { NewReceivableForm } from "./NewReceivableForm";
import { ReceivableInstallmentRow, ReceivableCollectedToggle } from "./ReceivableControls";
import { deleteReceivable, updateReceivable } from "./actions";
import type { Receivable, ReceivableKind, ReceivableStatus } from "@/lib/types";

export const metadata = { title: "Por cobrar · Cachin'" };

const statusTone: Record<ReceivableStatus, "warning" | "info" | "success"> = {
  pendiente: "warning",
  parcial: "info",
  cobrada: "success",
};
const statusLabel: Record<ReceivableStatus, string> = {
  pendiente: "Pendiente",
  parcial: "Cobro parcial",
  cobrada: "Cobrada",
};

const KIND_TABS: { value: ReceivableKind | "todo"; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "cobro", label: "Me deben" },
  { value: "prestamo", label: "Presté" },
];

function EditReceivableForm({ rec }: { rec: Receivable }) {
  return (
    <FormModal
      title="Editar registro"
      action={updateReceivable}
      submitLabel="Guardar"
      trigger="icon"
      triggerIcon="edit"
      triggerAriaLabel={`Editar ${rec.name}`}
    >
      <input type="hidden" name="id" value={rec.id} />
      <Field label="Persona" htmlFor={`ern-${rec.id}`} required>
        <Input id={`ern-${rec.id}`} name="name" defaultValue={rec.name} required />
      </Field>
      {rec.payment_type === "unico" ? (
        <>
          <Field label="Monto" htmlFor={`era-${rec.id}`} required>
            <MoneyInput
              id={`era-${rec.id}`}
              name="total_amount"
              defaultValue={String(rec.total_amount)}
              required
            />
          </Field>
          <Field label="Fecha esperada de cobro" htmlFor={`erd-${rec.id}`}>
            <DateField id={`erd-${rec.id}`} name="due_date" defaultValue={rec.due_date ?? ""} />
          </Field>
        </>
      ) : (
        <input type="hidden" name="total_amount" value={String(rec.total_amount)} />
      )}
      <Field label="Nota" htmlFor={`erno-${rec.id}`}>
        <Input id={`erno-${rec.id}`} name="note" defaultValue={rec.note ?? ""} placeholder="Opcional" />
      </Field>
    </FormModal>
  );
}

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const kindFilter: ReceivableKind | "todo" =
    sp.tipo === "cobro" || sp.tipo === "prestamo" ? sp.tipo : "todo";
  const range = parseRangePreset(sp.range);
  // Por `acquired_date` (cuándo lo registraste), que es la fecha que la propia
  // tarjeta enseña. No por `due_date`: es null en todo lo que va por cuotas,
  // así que filtrar por ella escondería justo los registros con más detalle. Y
  // la ventana de rangeBounds() cierra HOY — sobre una fecha esperada, siempre
  // futura, no dejaría nada visible.
  const { from, to } = rangeBounds(range);

  const today = todayISO();
  const [receivables, installments, accounts] = await Promise.all([
    getReceivables(),
    getReceivableInstallments(),
    getSavingsAccounts(),
  ]);

  const byRec = new Map<string, typeof installments>();
  for (const i of installments) {
    const arr = byRec.get(i.receivable_id) ?? [];
    arr.push(i);
    byRec.set(i.receivable_id, arr);
  }

  // Totales sobre TODO (no sobre el filtro): son el panorama completo.
  const pendingCobros = totalPending(receivables, installments, "cobro");
  const pendingPrestamos = totalPending(receivables, installments, "prestamo");

  const visible = receivables
    .filter((r) => kindFilter === "todo" || r.kind === kindFilter)
    .filter((r) => (!from || r.acquired_date >= from) && (!to || r.acquired_date <= to));

  const hrefFor = (next: { tipo?: string | null; range?: string | null }) =>
    hrefWith("/cobros", { tipo: sp.tipo, range: sp.range }, next);

  const tipoLabel =
    kindFilter === "cobro" ? "Me deben" : kindFilter === "prestamo" ? "Presté" : null;
  const activeFilters = [
    tipoLabel && { label: tipoLabel, removeHref: hrefFor({ tipo: null }) },
    range !== "todo" && {
      label: `Registrados: ${RANGE_LABEL[range].toLowerCase()}`,
      removeHref: hrefFor({ range: null }),
    },
  ].filter((f): f is { label: string; removeHref: string } => Boolean(f));

  // Próximo vencimiento entre lo que aún falta por cobrar
  const upcoming: string[] = [];
  for (const r of receivables) {
    if (r.status === "cobrada") continue;
    if (r.payment_type === "cuotas") {
      for (const i of byRec.get(r.id) ?? []) if (!i.paid) upcoming.push(i.due_date);
    } else if (r.due_date) {
      upcoming.push(r.due_date);
    }
  }
  upcoming.sort();
  const nextDue = upcoming[0] ?? null;

  return (
    <>
      <PageHeader
        title="Por cobrar"
        subtitle="Dinero que te deben y préstamos que hiciste"
        action={<NewReceivableForm today={today} triggerLabel="Nuevo" trigger="pill" accounts={accounts} />}
      />

      {/* Dos tiles idénticos enfrentados: ninguno mandaba. Manda el dinero
          que va a ENTRAR (es lo que se viene a consultar); lo prestado queda
          como contexto debajo. */}
      <div className="mb-5 flex flex-col gap-2.5">
        <StatTile
          emphasis="hero"
          label="Te deben"
          value={<Money value={pendingCobros} decimals={false} />}
          icon="arrowDownLeft"
          tone={pendingCobros > 0 ? "income" : "neutral"}
        />
        <StatTile
          emphasis="quiet"
          label="Prestaste"
          value={<Money value={pendingPrestamos} decimals={false} />}
          icon="wallet"
          tone={pendingPrestamos > 0 ? "warning" : "neutral"}
        />
      </div>

      {nextDue && (
        <Card className="mb-4 flex items-center gap-3 py-3">
          <IconBubble icon="clock" tone="neutral" size="sm" />
          <p className="text-sm text-muted">
            Próximo cobro esperado:{" "}
            <span className="font-bold text-ink">{formatDateShort(nextDue)}</span>
            {(() => {
              const d = daysBetween(today, nextDue);
              return d < 0 ? " · vencido" : d === 0 ? " · hoy" : ` · en ${d} días`;
            })()}
          </p>
        </Card>
      )}

      {receivables.length > 0 && (
        <>
          {/* ActiveFilters va acá abajo y no bajo el PageHeader (como en
              Movimientos) porque los dos tiles de arriba se calculan sobre
              TODO a propósito: si el aviso de "viendo solo…" quedara encima de
              ellos, parecería que las cifras también están recortadas. */}
          <ActiveFilters filters={activeFilters} clearHref="/cobros" />

          <div className="mb-5 flex items-center gap-2 flex-wrap">
            <SegmentedLinks
              label="Tipo"
              segments={KIND_TABS.map((t) => ({
                label: t.label,
                // Antes el href era `/cobros?tipo=x` a pelo: cambiar de
                // pestaña reescribía la URL entera y se llevaba por delante
                // cualquier otro filtro puesto.
                href: hrefFor({ tipo: t.value === "todo" ? null : t.value }),
                active: t.value === kindFilter,
              }))}
            />
            <FilterMenu
              label="Rango"
              value={RANGE_LABEL[range]}
              options={(Object.keys(RANGE_LABEL) as RangePreset[]).map((r) => ({
                label: RANGE_LABEL[r],
                href: hrefFor({ range: r === "todo" ? null : r }),
                active: r === range,
              }))}
            />
          </div>
        </>
      )}

      {receivables.length === 0 ? (
        <EmptyState
          icon="arrowDownLeft"
          illustration="make-it-rain"
          title="Nada por cobrar"
          message="Registra el dinero que te deben o un préstamo que hiciste. Un cobro no suma a tu balance hasta que lo recibes; un préstamo dado sale de tu cuenta de una vez."
          action={<NewReceivableForm today={today} triggerLabel="Registrar" accounts={accounts} />}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="arrowDownLeft"
          title="Sin resultados"
          message="Ningún registro coincide con este filtro."
          action={
            <Link href="/cobros" className="text-sm font-semibold text-primary-fg">
              Quitar filtros
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((r) => {
            const ins = (byRec.get(r.id) ?? []).sort((a, b) => a.seq - b.seq);
            const paidCount = ins.filter((i) => i.paid).length;
            const done = isCollected(r, installments);
            const cobrado = collectedOf(r, installments);
            const pendiente = pendingOf(r, installments);
            return (
              <li key={r.id}>
                <Card>
                  <div className="flex items-start gap-3">
                    <IconBubble
                      icon={r.kind === "prestamo" ? "wallet" : "arrowDownLeft"}
                      tone={done ? "brand" : r.kind === "prestamo" ? "warning" : "info"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <p className="font-bold text-ink truncate min-w-0">{r.name}</p>
                        <Badge tone="neutral" className="shrink-0">
                          {r.kind === "prestamo" ? "Presté" : "Me debe"}
                        </Badge>
                        <Badge tone={statusTone[r.status]} className="shrink-0">
                          {statusLabel[r.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-ink font-semibold mt-0.5">
                        <Money value={pendiente} /> {pendiente > 0 ? "por cobrar" : "al día"}
                        {cobrado > 0 && (
                          <span className="text-muted font-normal">
                            {" "}
                            · <Money value={cobrado} /> cobrado
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Desde el {formatDateLong(r.acquired_date)}
                        {r.note ? ` · ${r.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!done && <EditReceivableForm rec={r} />}
                      <DeleteButton
                        action={deleteReceivable.bind(null, r.id)}
                        title="¿Eliminar registro?"
                        message="Lo que ya te pagaron se conserva como movimiento manual — tu balance no cambia."
                      />
                    </div>
                  </div>

                  {r.payment_type === "cuotas" ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted mb-1">
                        Cuotas cobradas: {paidCount}/{ins.length}
                        {r.frequency ? ` · ${r.frequency}` : ""}
                      </p>
                      <div className="flex flex-col divide-y divide-line">
                        {ins.map((i) => (
                          <ReceivableInstallmentRow
                            key={i.id}
                            installment={i}
                            overdue={daysBetween(today, i.due_date) < 0}
                            accounts={accounts}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-xs text-muted mb-1">
                        {r.due_date
                          ? `Se espera cobrar el ${formatDateLong(r.due_date)}`
                          : "Sin fecha esperada"}
                      </p>
                      <ReceivableCollectedToggle
                        id={r.id}
                        paid={r.status === "cobrada"}
                        accounts={accounts}
                      />
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
