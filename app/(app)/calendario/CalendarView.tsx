"use client";

import { useState, useTransition } from "react";
import { monthGrid, dayStatus, type DayStatus } from "@/lib/calendar";
import { parseISODate, formatDateLong, formatDOP } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { IconBubble } from "@/components/ui/IconBubble";
import type { IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { ExceptionKind, FinEvent, FinEventType } from "@/lib/types";
import { setException, removeException } from "./actions";

interface DayInfo {
  kind: ExceptionKind;
  label: string | null;
}

interface Props {
  year: number;
  month: number; // 0-index
  exceptions: Record<string, DayInfo>;
  events: Record<string, FinEvent[]>;
  today: string;
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const cellStyle: Record<DayStatus, string> = {
  trabajo: "bg-white/60 text-ink",
  domingo: "bg-black/4 text-muted",
  feriado: "bg-danger-soft text-danger",
  libre: "bg-warning-soft text-warning",
};

const EVENT_TYPE_ORDER: FinEventType[] = ["pago", "deuda", "suscripcion", "feriado"];

const eventDotColor: Record<FinEventType, string> = {
  pago: "bg-primary",
  deuda: "bg-danger",
  suscripcion: "bg-info",
  feriado: "bg-danger",
};

const eventIcon: Record<FinEventType, IconName> = {
  pago: "wallet",
  deuda: "debt",
  suscripcion: "repeat",
  feriado: "calendar",
};

const eventTone: Record<FinEventType, "brand" | "danger" | "warning" | "info" | "neutral"> = {
  pago: "brand",
  deuda: "danger",
  suscripcion: "info",
  feriado: "danger",
};

const eventTypeLabel: Record<FinEventType, string> = {
  pago: "Día de pago",
  deuda: "Deuda",
  suscripcion: "Suscripción",
  feriado: "Feriado",
};

export function CalendarView({ year, month, exceptions, events, today }: Props) {
  const weeks = monthGrid(year, month);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selInfo = selected ? exceptions[selected] : undefined;
  const selectedEvents = selected ? (events[selected] ?? []) : [];

  function apply(kind: ExceptionKind) {
    if (!selected) return;
    startTransition(async () => {
      await setException(selected, kind, null);
      setSelected(null);
    });
  }

  function clear() {
    if (!selected) return;
    startTransition(async () => {
      await removeException(selected);
      setSelected(null);
    });
  }

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className={cn(
              "text-center text-xs font-bold py-1",
              i === 6 ? "text-muted" : "text-ink/60",
            )}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((iso, di) => {
              if (!iso) return <div key={di} />;
              const info = exceptions[iso];
              const status = dayStatus(iso, info?.kind);
              const isToday = iso === today;
              const isOverride = info?.kind === "trabajado";
              const dayNum = parseISODate(iso).getDate();
              const dayEvents = events[iso] ?? [];
              const activeTypes = new Set<FinEventType>(dayEvents.map((e) => e.type));
              if (info?.kind === "feriado") activeTypes.add("feriado");
              const dots = EVENT_TYPE_ORDER.filter((t) => activeTypes.has(t));
              return (
                <button
                  key={di}
                  onClick={() => setSelected(iso)}
                  className={cn(
                    "relative aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-[filter,transform] cursor-pointer hover:brightness-95 active:scale-90",
                    isOverride ? "bg-primary text-white" : cellStyle[status],
                    isToday && "ring-2 ring-primary ring-offset-1 ring-offset-transparent",
                  )}
                  aria-label={`${dayNum}, ${isOverride ? "trabajado" : status}`}
                >
                  {dayNum}
                  {dots.length > 0 && (
                    <span className="absolute bottom-1 flex items-center gap-0.5">
                      {dots.map((t) => (
                        <span key={t} className={cn("size-1 rounded-full", eventDotColor[t])} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-xs text-muted">
        <Legend className="bg-white/70 border border-black/10" label="Trabajo" />
        <Legend className="bg-black/10" label="Domingo" />
        <Legend className="bg-danger-soft" label="Feriado" />
        <Legend className="bg-warning-soft" label="Libre" />
        <Legend className="bg-primary" label="Trabajado extra" />
        <Legend dot className="bg-primary" label="Pago" />
        <Legend dot className="bg-danger" label="Deuda" />
        <Legend dot className="bg-info" label="Suscripción" />
      </div>

      {/* Modal de día */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatDateLong(selected) : ""}
        compact
      >
        {selInfo && (
          <p className="text-sm text-muted -mt-1 mb-3">
            Marcado actualmente como{" "}
            <span className="font-semibold text-ink">{selInfo.kind}</span>
            {selInfo.label ? ` · ${selInfo.label}` : ""}.
          </p>
        )}
        {selectedEvents.length > 0 && (
          <div className="flex flex-col gap-2 mb-3 pb-3 border-b border-black/5">
            {selectedEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-3">
                <IconBubble icon={eventIcon[e.type]} tone={eventTone[e.type]} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{e.label}</p>
                  <p className="text-xs text-muted">{eventTypeLabel[e.type]}</p>
                </div>
                {e.amount != null && (
                  <p className="text-sm font-bold text-ink tabular shrink-0">
                    {formatDOP(e.amount, false)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <DayOption
            icon="calendar"
            label="Feriado"
            hint="No cuenta como día trabajado"
            onClick={() => apply("feriado")}
            disabled={pending}
          />
          <DayOption
            icon="clock"
            label="Día libre"
            hint="Día libre adicional"
            onClick={() => apply("libre")}
            disabled={pending}
          />
          <DayOption
            icon="check"
            label="Trabajado (extra)"
            hint="Forzar como día trabajado (ej. un domingo)"
            onClick={() => apply("trabajado")}
            disabled={pending}
          />
          {selInfo && (
            <DayOption
              icon="close"
              label="Quitar marca"
              hint="Volver al calendario normal"
              onClick={clear}
              disabled={pending}
              danger
            />
          )}
        </div>
      </Modal>
    </>
  );
}

function Legend({
  className,
  label,
  dot,
}: {
  className: string;
  label: string;
  dot?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(dot ? "size-2 rounded-full" : "size-3 rounded-md", className)} />
      {label}
    </span>
  );
}

function DayOption({
  icon,
  label,
  hint,
  onClick,
  disabled,
  danger,
}: {
  icon: "calendar" | "clock" | "check" | "close";
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 p-3 rounded-2xl text-left transition-colors cursor-pointer disabled:opacity-50",
        danger ? "hover:bg-danger-soft" : "hover:bg-black/5",
      )}
    >
      <IconBubble icon={icon} tone={danger ? "danger" : "neutral"} size="sm" />
      <span className="min-w-0">
        <span className="block font-semibold text-ink text-sm">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </button>
  );
}
