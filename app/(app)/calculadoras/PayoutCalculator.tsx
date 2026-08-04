"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, MoneyInput } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBubble } from "@/components/ui/IconBubble";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatDOP, formatDateShort } from "@/lib/format";
import { payoutTotals, type PayoutItem } from "@/lib/payoutPlan";

interface Props {
  gross: number;
  nextPay: string | null;
  daysUntilNextPay: number;
  items: PayoutItem[];
}

/** "Cobro el 20, ¿con cuánto me quedo?"
 *
 *  El Inicio ya lista los compromisos próximos, pero nunca los resta del
 *  sueldo: esa cuenta la hacía el usuario de cabeza cada quincena. Acá se
 *  hace sola, y se puede destildar lo que no vaya a pagar en este cobro —
 *  que es la parte que ninguna cifra automática puede adivinar.
 *
 *  Arranca con TODO tildado: olvidarse de restar algo hace daño, restar de
 *  más solo asusta. */
export function PayoutCalculator({ gross, nextPay, daysUntilNextPay, items }: Props) {
  const [monto, setMonto] = useState(gross > 0 ? String(gross) : "");
  const [excluidos, setExcluidos] = useState<string[]>([]);

  const montoN = Number(monto.replace(/[^0-9.]/g, "")) || 0;
  const { comprometido, neto, porDia } = payoutTotals(montoN, items, excluidos, daysUntilNextPay);
  const enRojo = neto < 0;

  function alternar(id: string) {
    setExcluidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-hero tone-calc bg-gradient-brand px-5 py-6 text-center shadow-hero">
        <p className="text-sm font-medium text-on-brand-muted">Te queda libre</p>
        <p className="money-lg font-extrabold text-on-brand tabular mt-0.5">
          {formatDOP(neto, false)}
        </p>
        <p className="text-xs text-on-brand-muted mt-1.5">
          {montoN <= 0
            ? "Pon cuánto vas a cobrar"
            : enRojo
              ? "Debes más de lo que cobras en este período"
              : porDia != null
                ? `${formatDOP(porDia, false)} por día hasta el próximo cobro`
                : "Hoy es día de cobro"}
        </p>
      </div>

      <Field label="¿Cuánto vas a cobrar?" htmlFor="payout-monto" required>
        <MoneyInput
          id="payout-monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </Field>

      {items.length === 0 ? (
        /* Sin EmptyState: ese componente exige una acción, y "no debes nada"
           es una buena noticia, no una pantalla a la que le falte algo. La
           única acción real aparece cuando ni siquiera hay fecha de cobro. */
        <Card className="flex items-center gap-3">
          <IconBubble icon={nextPay ? "check" : "alert"} tone={nextPay ? "brand" : "warning"} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              {nextPay
                ? "No hay deudas ni suscripciones que venzan antes de tu próximo cobro."
                : "Falta decir cuándo cobras para saber qué se te viene encima."}
            </p>
            {!nextPay && (
              <Link href="/ingresos" className="text-sm font-semibold text-primary-fg">
                Configurar en Ingresos
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-sm font-bold text-ink">Antes de tu próximo cobro</h2>
            <p className="text-sm text-muted">
              {nextPay ? formatDateShort(nextPay) : ""}
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {items.map((i) => {
              const incluido = !excluidos.includes(i.id);
              return (
                <li key={i.id}>
                  {/* La fila ENTERA alterna, no una casilla de 20px: es lo que
                      se toca en un teléfono. El estado se lee por el relleno
                      del check y por si el monto está tachado, no solo por
                      color — un daltónico ve el cambio igual. */}
                  <button
                    type="button"
                    onClick={() => alternar(i.id)}
                    aria-pressed={incluido}
                    className={cn(
                      "card rounded-card w-full flex items-center gap-3 px-4 py-2.5 text-left",
                      "cursor-pointer transition-opacity active:scale-[0.99]",
                      !incluido && "opacity-55",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid place-items-center size-6 shrink-0 rounded-tile border-2 transition-colors",
                        incluido
                          ? "bg-primary border-primary text-on-brand"
                          : "border-line-strong text-transparent",
                      )}
                    >
                      <Icon name="check" size={14} />
                    </span>
                    <IconBubble
                      icon={i.kind === "debt" ? "debt" : "repeat"}
                      tone={i.overdue ? "danger" : i.kind === "debt" ? "warning" : "info"}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{i.name}</p>
                      <p className="text-xs text-muted">{formatDateShort(i.date)}</p>
                    </div>
                    {i.overdue && <Badge tone="danger">Vencida</Badge>}
                    <p
                      className={cn(
                        "text-sm font-bold tabular shrink-0",
                        incluido ? "text-expense" : "text-muted line-through",
                      )}
                    >
                      −{formatDOP(i.amount, false)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <Card className="flex flex-col gap-2 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">Cobras</span>
              <span className="text-sm font-bold text-ink tabular">{formatDOP(montoN, false)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">
                Comprometido{excluidos.length > 0 && ` (${excluidos.length} sin contar)`}
              </span>
              <span className="text-sm font-bold text-expense tabular">
                −{formatDOP(comprometido, false)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
              <span className="text-sm font-semibold text-ink">Te queda</span>
              <span
                className={cn(
                  "text-sm font-extrabold tabular",
                  enRojo ? "text-expense" : "text-income",
                )}
              >
                {formatDOP(neto, false)}
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
