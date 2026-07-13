"use client";

import { useState, useTransition } from "react";
import { monthGrid, dayStatus, type DayStatus } from "@/lib/calendar";
import { parseISODate, formatDateLong } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { ExceptionKind } from "@/lib/types";
import { setException, removeException } from "./actions";

interface DayInfo {
  kind: ExceptionKind;
  label: string | null;
}

interface Props {
  year: number;
  month: number; // 0-index
  exceptions: Record<string, DayInfo>;
  today: string;
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const cellStyle: Record<DayStatus, string> = {
  trabajo: "bg-white/60 text-ink",
  domingo: "bg-black/4 text-muted",
  feriado: "bg-danger-soft text-danger",
  libre: "bg-warning-soft text-warning",
};

export function CalendarView({ year, month, exceptions, today }: Props) {
  const weeks = monthGrid(year, month);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selInfo = selected ? exceptions[selected] : undefined;

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
              return (
                <button
                  key={di}
                  onClick={() => setSelected(iso)}
                  className={cn(
                    "relative aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-colors cursor-pointer hover:brightness-95",
                    isOverride ? "bg-primary text-white" : cellStyle[status],
                    isToday && "ring-2 ring-primary ring-offset-1 ring-offset-transparent",
                  )}
                  aria-label={`${dayNum}, ${isOverride ? "trabajado" : status}`}
                >
                  {dayNum}
                  {info?.kind === "feriado" && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-danger" />
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
      </div>

      {/* Modal de día */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatDateLong(selected) : ""}
      >
        {selInfo && (
          <p className="text-sm text-muted -mt-1 mb-3">
            Marcado actualmente como{" "}
            <span className="font-semibold text-ink">{selInfo.kind}</span>
            {selInfo.label ? ` · ${selInfo.label}` : ""}.
          </p>
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

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-md", className)} />
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
      <span
        className={cn(
          "grid place-items-center size-9 rounded-full shrink-0",
          danger ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary",
        )}
      >
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-ink text-sm">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </button>
  );
}
