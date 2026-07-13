import Link from "next/link";
import { getExceptions } from "@/lib/data";
import { toISODate, formatMonth, todayISO } from "@/lib/format";
import { countWorkdays, exceptionsMap } from "@/lib/calendar";
import { monthPeriods } from "@/lib/periods";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatTile } from "@/components/ui/StatTile";
import { Icon } from "@/components/ui/Icon";
import { CalendarView } from "./CalendarView";
import { LoadHolidaysButton } from "./LoadHolidaysButton";
import type { ExceptionKind } from "@/lib/types";

export const metadata = { title: "Calendario · Finanzas" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.y) || now.getFullYear();
  const month = sp.m != null && sp.m !== "" ? Number(sp.m) : now.getMonth();

  const monthStart = toISODate(new Date(year, month, 1, 12));
  const monthEnd = toISODate(new Date(year, month + 1, 0, 12));

  const exceptions = await getExceptions(monthStart, monthEnd);
  const exMap = exceptionsMap(exceptions);

  // Record para la vista (kind + label)
  const exRecord: Record<string, { kind: ExceptionKind; label: string | null }> =
    {};
  for (const e of exceptions) exRecord[e.date] = { kind: e.kind, label: e.label };

  // Conteos
  const workedMonth = countWorkdays(monthStart, monthEnd, exMap);
  const [q1, q2] = monthPeriods(year, month);
  const workedQ1 = countWorkdays(q1.start, q1.end, exMap);
  const workedQ2 = countWorkdays(q2.start, q2.end, exMap);

  // Navegación
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const prevHref = `/calendario?y=${prevYear}&m=${prevMonth}`;
  const nextHref = `/calendario?y=${nextYear}&m=${nextMonth}`;

  return (
    <>
      <PageHeader
        title="Calendario laboral"
        subtitle="Lunes a sábado laborable · domingo libre"
      />

      <GlassCard className="mb-4">
        {/* Cabecera del mes */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href={prevHref}
            aria-label="Mes anterior"
            className="grid place-items-center size-10 rounded-full hover:bg-black/5 text-ink cursor-pointer"
          >
            <Icon name="chevronLeft" size={22} />
          </Link>
          <h2 className="text-lg font-extrabold text-ink capitalize">
            {formatMonth(year, month)}
          </h2>
          <Link
            href={nextHref}
            aria-label="Mes siguiente"
            className="grid place-items-center size-10 rounded-full hover:bg-black/5 text-ink cursor-pointer"
          >
            <Icon name="chevronRight" size={22} />
          </Link>
        </div>

        <CalendarView
          year={year}
          month={month}
          exceptions={exRecord}
          today={todayISO()}
        />

        <p className="text-xs text-muted mt-4">
          Toca cualquier día para marcarlo como feriado, libre o trabajado.
        </p>
      </GlassCard>

      {/* Conteos */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatTile label="Días trabajados (mes)" value={String(workedMonth)} icon="calendar" />
        <StatTile label="1ª quincena" value={String(workedQ1)} tone="neutral" />
        <StatTile label="2ª quincena" value={String(workedQ2)} tone="neutral" />
      </div>

      <div className="flex items-center justify-between gap-3 glass rounded-[var(--radius-glass)] p-4">
        <p className="text-sm text-muted">
          ¿Nuevo año? Carga los feriados dominicanos oficiales y luego ajusta los
          que necesites.
        </p>
        <LoadHolidaysButton year={year} />
      </div>
    </>
  );
}
