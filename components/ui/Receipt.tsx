"use client";

import { Icon } from "./Icon";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

export interface ReceiptRow {
  label: string;
  value: string;
}

export interface ReceiptData {
  /** "Gasto registrado", "Ingreso registrado"… */
  title: string;
  /** La cifra del movimiento, ya formateada. Es lo dominante del recibo. */
  amount: string;
  /** Signo visual del dinero: tiñe la cifra y el ícono. */
  direction: "in" | "out" | "neutral";
  rows: ReceiptRow[];
  /** Se guardó en la cola offline (lib/offlineQueue.ts) y todavía no llegó
   *  al servidor. El recibo NO puede decir "listo" en ese caso. */
  queued?: boolean;
}

const directionText = {
  in: "text-income",
  out: "text-expense",
  neutral: "text-ink",
};

/** Confirmación de un registro: check, la cifra, y el detalle como lista
 *  clave-valor. Antes el modal se cerraba en silencio y solo quedaba un
 *  toast de dos segundos, así que no había forma de repasar lo que se acabó
 *  de guardar sin ir a buscarlo en la lista.
 *
 *  No lleva número de referencia: las Server Actions de este proyecto
 *  devuelven `{ ok, error }` y no el id de la fila creada, así que
 *  cualquier "No. Ref" aquí sería inventado. */
export function Receipt({ data, onDone }: { data: ReceiptData; onDone: () => void }) {
  const { queued } = data;

  return (
    <div className="flex flex-col items-center text-center">
      <span
        className={cn(
          "grid place-items-center size-16 rounded-pill",
          queued ? "bg-tint-warning text-warning" : "bg-tint-income text-income",
        )}
      >
        <Icon name={queued ? "clock" : "check"} size={32} />
      </span>

      {/* El título ("Gasto registrado") lo pone la cabecera del modal, que
          además es el accessible name del diálogo — repetirlo aquí sería
          leerlo dos veces. */}
      <p className="mt-4 text-sm font-semibold text-muted">
        {queued ? "Guardado sin conexión" : "Monto"}
      </p>
      <p
        className={cn(
          "money-lg font-extrabold tabular mt-0.5",
          queued ? "text-ink" : directionText[data.direction],
        )}
      >
        {data.amount}
      </p>

      {queued && (
        <p className="mt-2 text-xs text-muted max-w-[34ch]">
          Se enviará solo en cuanto vuelvas a tener señal. Puedes cerrar la app.
        </p>
      )}

      {/* Lista clave-valor: etiqueta a la izquierda, valor alineado a la
          derecha. Las secciones se separan por espacio, no por línea. */}
      {data.rows.length > 0 && (
        <dl className="w-full mt-7 flex flex-col gap-3">
          {data.rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-muted shrink-0">{r.label}</dt>
              <dd className="text-sm font-semibold text-ink text-right min-w-0 break-words">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <Button full className="mt-8" onClick={onDone}>
        Listo
      </Button>
    </div>
  );
}
