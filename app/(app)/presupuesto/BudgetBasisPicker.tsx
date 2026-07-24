"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { parseISODate, toISODate, formatDateShort } from "@/lib/format";
import { setCustomBudgetDays, setPeriodOverride } from "./actions";

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

/** Todas las fechas del período, para pintar la rejilla del calendario. */
function daysInPeriod(start: string, end: string): string[] {
  const out: string[] = [];
  const d = parseISODate(start);
  const last = parseISODate(end);
  while (d <= last) {
    out.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** R13: elegir CÓMO se cuentan los días del presupuesto de esta quincena.
 *  Modo A (días trabajados) y Modo B (días personalizados) son mutuamente
 *  excluyentes — el calendario solo se habilita con el Modo A desactivado,
 *  y cuando está deshabilitado se ve y se explica, no se esconde. */
export function BudgetBasisPicker({
  periodKey,
  periodStart,
  periodEnd,
  periodLabel,
  mode,
  days,
  customDays,
}: {
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  mode: "trabajados" | "personalizado";
  days: number;
  customDays: string[];
}) {
  const [open, setOpen] = useState(false);
  const [localMode, setLocalMode] = useState(mode);
  const [selected, setSelected] = useState<string[]>(customDays);
  const [manualCount, setManualCount] = useState(String(days));
  const [pending, startTransition] = useTransition();

  const isCustom = localMode === "personalizado";
  const grid = daysInPeriod(periodStart, periodEnd);
  const leadingBlanks = parseISODate(periodStart).getDay();

  function openModal() {
    setLocalMode(mode);
    setSelected(customDays);
    setManualCount(String(days));
    setOpen(true);
  }

  function toggleDay(iso: string) {
    if (!isCustom) return;
    setSelected((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
    );
  }

  function save() {
    startTransition(async () => {
      if (isCustom) {
        await setCustomBudgetDays(periodKey, selected);
      } else {
        const fd = new FormData();
        fd.set("period_key", periodKey);
        fd.set("workdays", manualCount);
        await setPeriodOverride(fd);
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary cursor-pointer"
      >
        <Icon name="edit" size={16} />
        {mode === "personalizado" ? `${days} días elegidos` : "Ajustar días"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Días de la quincena ${periodLabel}`}>
        <p className="text-sm text-muted -mt-1">
          Con cuántos días se multiplica tu gasto fijo por día.
        </p>

        {/* Selector de modo — mutuamente excluyentes */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => setLocalMode("trabajados")}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-3 text-left cursor-pointer transition-colors",
              !isCustom ? "border-primary bg-primary-soft" : "border-black/10",
            )}
          >
            <span
              className={cn(
                "grid place-items-center size-5 rounded-full border-2 shrink-0 mt-0.5",
                !isCustom ? "bg-primary border-primary text-white" : "border-black/20 text-transparent",
              )}
            >
              <Icon name="check" size={12} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">Días trabajados</span>
              <span className="block text-xs text-muted">
                Del calendario laboral (lunes a sábado, menos feriados y libres).
              </span>
            </span>
          </button>

          <button
            onClick={() => setLocalMode("personalizado")}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-3 text-left cursor-pointer transition-colors",
              isCustom ? "border-primary bg-primary-soft" : "border-black/10",
            )}
          >
            <span
              className={cn(
                "grid place-items-center size-5 rounded-full border-2 shrink-0 mt-0.5",
                isCustom ? "bg-primary border-primary text-white" : "border-black/20 text-transparent",
              )}
            >
              <Icon name="check" size={12} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">Días personalizados</span>
              <span className="block text-xs text-muted">
                Tú eliges en el calendario exactamente qué días cuentan.
              </span>
            </span>
          </button>
        </div>

        {!isCustom ? (
          <div className="mt-4">
            <Field
              label="Días trabajados"
              htmlFor="basis-count"
              hint="Déjalo como está para usar el conteo automático, o escribe otro número."
            >
              <Input
                id="basis-count"
                type="number"
                min={0}
                inputMode="numeric"
                value={manualCount}
                onChange={(e) => setManualCount(e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-semibold text-ink mb-2">
              Toca los días que cuentan
              <span className="font-normal text-muted"> · {selected.length} elegidos</span>
            </p>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((w, i) => (
                <span key={i} className="text-center text-[0.65rem] font-bold text-muted py-1">
                  {w}
                </span>
              ))}
              {Array.from({ length: leadingBlanks }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {grid.map((iso) => {
                const on = selected.includes(iso);
                return (
                  <button
                    key={iso}
                    onClick={() => toggleDay(iso)}
                    className={cn(
                      "aspect-square rounded-xl text-xs font-semibold transition-colors cursor-pointer",
                      on ? "bg-primary text-white" : "bg-black/5 text-ink/70 hover:bg-black/10",
                    )}
                  >
                    {Number(iso.slice(8, 10))}
                  </button>
                );
              })}
            </div>
            {selected.length === 0 && (
              <p className="text-xs text-muted mt-2">
                Sin días elegidos se vuelve al conteo automático del calendario.
              </p>
            )}
            {selected.length > 0 && (
              <p className="text-xs text-muted mt-2">
                Del {formatDateShort(selected[0])} al {formatDateShort(selected[selected.length - 1])}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} full>
            Cancelar
          </Button>
          <Button onClick={save} loading={pending} full>
            Guardar
          </Button>
        </div>
      </Modal>
    </>
  );
}
