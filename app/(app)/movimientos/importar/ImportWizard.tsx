"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input, Select } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { parseCsv, parseCsvAmount, parseCsvDate, type ParsedCsv } from "@/lib/csv";
import { saveImportProfile, getExistingForDuplicateCheck, confirmImport, type ImportRow } from "./actions";
import type { CsvDateFormat, ImportProfile, SavingsAccount } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

interface PreviewRow extends ImportRow {
  include: boolean;
  isDuplicate: boolean;
  error: string | null;
}

const DATE_FORMATS: { value: CsvDateFormat; label: string }[] = [
  { value: "YYYY-MM-DD", label: "AAAA-MM-DD (ISO)" },
  { value: "DD/MM/YYYY", label: "DD/MM/AAAA" },
  { value: "MM/DD/YYYY", label: "MM/DD/AAAA" },
];

/** Un perfil "calza" con el CSV subido si todas sus columnas guardadas
 *  existen en los encabezados de este archivo — así no hace falta pedirle
 *  al usuario que elija manualmente cuál banco es cada vez. */
function matchingProfile(profiles: ImportProfile[], headers: string[]): ImportProfile | null {
  const set = new Set(headers);
  return (
    profiles.find((p) => {
      const cols = [p.date_column, p.description_column, p.amount_column, p.debit_column, p.credit_column].filter(
        (c): c is string => !!c,
      );
      return cols.every((c) => set.has(c));
    }) ?? null
  );
}

/** El asistente completo de importación: subir → mapear columnas → revisar
 *  (con detección de duplicados) → confirmar. Todo en un componente para
 *  que el estado entre pasos (el CSV parseado, el mapeo elegido) no se
 *  pierda navegando — no hay nada que persistir a medio camino. */
export function ImportWizard({ accounts, profiles }: { accounts: SavingsAccount[]; profiles: ImportProfile[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [dateColumn, setDateColumn] = useState("");
  const [descColumn, setDescColumn] = useState("");
  const [amountMode, setAmountMode] = useState<"single" | "split">("single");
  const [amountColumn, setAmountColumn] = useState("");
  const [debitColumn, setDebitColumn] = useState("");
  const [creditColumn, setCreditColumn] = useState("");
  const [dateFormat, setDateFormat] = useState<CsvDateFormat>("YYYY-MM-DD");
  const [decimalSeparator, setDecimalSeparator] = useState<"." | ",">(".");
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [buildingPreview, setBuildingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const accountName = accounts.find((a) => a.id === accountId)?.name ?? "";

  function reset() {
    setStep(1);
    setParsed(null);
    setFileError(null);
    setPreviewRows([]);
    setError(null);
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    try {
      const text = await file.text();
      const result = parseCsv(text);
      if (result.headers.length < 2 || result.rows.length === 0) {
        setFileError("No se pudo leer el archivo — revisa que sea un CSV con encabezado y al menos una fila.");
        return;
      }
      setParsed(result);

      const match = matchingProfile(profiles, result.headers);
      if (match) {
        setDateColumn(match.date_column);
        setDescColumn(match.description_column);
        setDateFormat(match.date_format);
        setDecimalSeparator(match.decimal_separator);
        if (match.amount_column) {
          setAmountMode("single");
          setAmountColumn(match.amount_column);
        } else if (match.debit_column && match.credit_column) {
          setAmountMode("split");
          setDebitColumn(match.debit_column);
          setCreditColumn(match.credit_column);
        }
      } else {
        // Sin perfil guardado: adivina por nombre de columna, para que el
        // usuario no arranque con los 5 selects en blanco.
        const guess = (needle: string) =>
          result.headers.find((h) => h.toLowerCase().includes(needle)) ?? "";
        setDateColumn(guess("fecha") || guess("date"));
        setDescColumn(guess("descrip") || guess("concepto") || guess("detalle"));
        setAmountColumn(guess("monto") || guess("importe") || guess("amount"));
      }
      setStep(2);
    } catch {
      setFileError("No se pudo leer el archivo.");
    }
  }

  async function buildPreview() {
    if (!parsed) return;
    setError(null);
    setBuildingPreview(true);
    try {
      const dateIdx = parsed.headers.indexOf(dateColumn);
      const descIdx = parsed.headers.indexOf(descColumn);
      const amountIdx = amountMode === "single" ? parsed.headers.indexOf(amountColumn) : -1;
      const debitIdx = amountMode === "split" ? parsed.headers.indexOf(debitColumn) : -1;
      const creditIdx = amountMode === "split" ? parsed.headers.indexOf(creditColumn) : -1;

      if (dateIdx === -1 || descIdx === -1) {
        setError("Elige las columnas de fecha y descripción.");
        setBuildingPreview(false);
        return;
      }
      if (amountMode === "single" && amountIdx === -1) {
        setError("Elige la columna de monto.");
        setBuildingPreview(false);
        return;
      }
      if (amountMode === "split" && (debitIdx === -1 || creditIdx === -1)) {
        setError("Elige las columnas de débito y crédito.");
        setBuildingPreview(false);
        return;
      }

      const rows: PreviewRow[] = parsed.rows.map((r) => {
        const date = parseCsvDate(r[dateIdx] ?? "", dateFormat);
        const note = (r[descIdx] ?? "").trim();
        let amount = NaN;
        let isExpense = true;

        if (amountMode === "single") {
          const raw = parseCsvAmount(r[amountIdx] ?? "", decimalSeparator);
          amount = Math.abs(raw);
          isExpense = raw < 0;
        } else {
          const debit = parseCsvAmount(r[debitIdx] ?? "", decimalSeparator);
          const credit = parseCsvAmount(r[creditIdx] ?? "", decimalSeparator);
          if (debit > 0) {
            amount = debit;
            isExpense = true;
          } else if (credit > 0) {
            amount = credit;
            isExpense = false;
          }
        }

        let rowError: string | null = null;
        if (!date) rowError = "Fecha no reconocida";
        else if (!Number.isFinite(amount) || amount <= 0) rowError = "Monto no reconocido";

        return {
          date: date ?? "",
          amount: Number.isFinite(amount) ? amount : 0,
          note,
          isExpense,
          include: !rowError,
          isDuplicate: false,
          error: rowError,
        };
      });

      // Detección de duplicados: una sola consulta contra lo que ya existe
      // en esa cuenta dentro del rango de fechas del archivo, en vez de una
      // ida y vuelta al servidor por fila.
      const validDates = rows.map((r) => r.date).filter(Boolean).sort();
      if (validDates.length > 0 && accountId) {
        const from = validDates[0];
        const to = validDates[validDates.length - 1];
        const existing = await getExistingForDuplicateCheck(accountId, from, to);
        for (const row of rows) {
          if (!row.date) continue;
          const dup = existing.some(
            (e) => Math.abs(dayDiff(e.date, row.date)) <= 1 && Math.abs(e.amount - row.amount) < 0.01,
          );
          if (dup) {
            row.isDuplicate = true;
            row.include = false;
          }
        }
      }

      setPreviewRows(rows);
      setStep(3);
    } finally {
      setBuildingPreview(false);
    }
  }

  function toggleRow(i: number) {
    setPreviewRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, include: !r.include } : r)));
  }

  async function handleSaveProfile() {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    const fd = new FormData();
    fd.set("name", profileName.trim());
    fd.set("date_column", dateColumn);
    fd.set("description_column", descColumn);
    if (amountMode === "single") fd.set("amount_column", amountColumn);
    else {
      fd.set("debit_column", debitColumn);
      fd.set("credit_column", creditColumn);
    }
    fd.set("date_format", dateFormat);
    fd.set("decimal_separator", decimalSeparator);
    const res = await saveImportProfile(fd);
    setSavingProfile(false);
    if (res.ok) setProfileName("");
    else setError(res.error ?? "No se pudo guardar el mapeo.");
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    const selected = previewRows.filter((r) => r.include);
    const res = await confirmImport(accountId, selected);
    setConfirming(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo importar.");
      return;
    }
    setImportedCount(res.count ?? selected.length);
    setStep(4);
    router.refresh();
  }

  const included = previewRows.filter((r) => r.include).length;
  const duplicates = previewRows.filter((r) => r.isDuplicate).length;
  const withErrors = previewRows.filter((r) => r.error).length;

  const previewSample = useMemo(() => (parsed ? parsed.rows.slice(0, 3) : []), [parsed]);

  return (
    <div className="flex flex-col gap-4">
      {/* Progreso */}
      <div className="flex items-center gap-1.5 px-1">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-black/10"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <GlassCard className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Sube el estado de cuenta que descargaste de tu banco en formato CSV — funciona con la mayoría de bancos
            dominicanos, sin importar el orden de columnas.
          </p>
          <Field label="¿A qué cuenta entra este extracto?" htmlFor="import-account">
            <Select id="import-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <label
              htmlFor="import-file"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 py-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary-soft/40 transition-colors"
            >
              <Icon name="wallet" size={28} className="text-muted" />
              <span className="text-sm font-semibold text-ink">Toca para elegir tu archivo .csv</span>
              <span className="text-xs text-muted">Exportado desde la banca en línea de tu banco</span>
            </label>
            <input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="sr-only"
            />
          </div>
          {fileError && (
            <p className="text-sm font-medium text-danger bg-danger-soft rounded-2xl px-3 py-2 flex items-center gap-2">
              <Icon name="alert" size={18} />
              {fileError}
            </p>
          )}
        </GlassCard>
      )}

      {step === 2 && parsed && (
        <GlassCard className="flex flex-col gap-4">
          <div>
            <h2 className="font-bold text-ink mb-1">¿Qué es cada columna?</h2>
            <p className="text-sm text-muted">
              {matchingProfile(profiles, parsed.headers)
                ? "Reconocimos este banco por un mapeo que ya tenías guardado — revísalo o cámbialo."
                : "La primera vez hay que indicarlo; se puede guardar para no repetir esto la próxima."}
            </p>
          </div>

          {/* Vista cruda de las primeras filas, para confirmar que el CSV se leyó bien */}
          <div className="overflow-x-auto rounded-2xl border border-black/5">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black/[0.03]">
                  {parsed.headers.map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-semibold text-ink whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewSample.map((r, i) => (
                  <tr key={i} className="border-t border-black/5">
                    {r.map((cell, j) => (
                      <td key={j} className="px-2 py-1.5 text-muted whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Field label="Columna de fecha" htmlFor="col-date">
            <Select id="col-date" value={dateColumn} onChange={(e) => setDateColumn(e.target.value)}>
              {parsed.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Formato de esa fecha" htmlFor="date-format">
            <Select id="date-format" value={dateFormat} onChange={(e) => setDateFormat(e.target.value as CsvDateFormat)}>
              {DATE_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Columna de descripción" htmlFor="col-desc">
            <Select id="col-desc" value={descColumn} onChange={(e) => setDescColumn(e.target.value)}>
              {parsed.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="¿Cómo viene el monto?" htmlFor="amount-mode">
            <Select id="amount-mode" value={amountMode} onChange={(e) => setAmountMode(e.target.value as "single" | "split")}>
              <option value="single">Una columna (negativo = gasto, positivo = ingreso)</option>
              <option value="split">Dos columnas separadas (débito y crédito)</option>
            </Select>
          </Field>
          {amountMode === "single" ? (
            <Field label="Columna de monto" htmlFor="col-amount">
              <Select id="col-amount" value={amountColumn} onChange={(e) => setAmountColumn(e.target.value)}>
                {parsed.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Columna de débito" htmlFor="col-debit">
                <Select id="col-debit" value={debitColumn} onChange={(e) => setDebitColumn(e.target.value)}>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Columna de crédito" htmlFor="col-credit">
                <Select id="col-credit" value={creditColumn} onChange={(e) => setCreditColumn(e.target.value)}>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <Field label="Separador decimal" htmlFor="decimal-sep" hint="RD$1.234,56 usa coma · RD$1,234.56 usa punto.">
            <Select id="decimal-sep" value={decimalSeparator} onChange={(e) => setDecimalSeparator(e.target.value as "." | ",")}>
              <option value=".">Punto (1,234.56)</option>
              <option value=",">Coma (1.234,56)</option>
            </Select>
          </Field>

          <div className="flex items-end gap-2 rounded-2xl bg-black/[0.03] p-3">
            <Field label="Guardar este mapeo como" htmlFor="profile-name" hint="Para no repetir esto la próxima vez que subas un extracto de este banco.">
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ej.: Banco Popular"
              />
            </Field>
            <Button type="button" variant="secondary" onClick={handleSaveProfile} loading={savingProfile} disabled={!profileName.trim()}>
              Guardar
            </Button>
          </div>

          {error && (
            <p className="text-sm font-medium text-danger bg-danger-soft rounded-2xl px-3 py-2 flex items-center gap-2">
              <Icon name="alert" size={18} />
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={reset} full>
              Cancelar
            </Button>
            <Button type="button" onClick={buildPreview} loading={buildingPreview} full>
              Ver vista previa
            </Button>
          </div>
        </GlassCard>
      )}

      {step === 3 && (
        <>
          <GlassCard className="flex flex-col gap-1">
            <p className="text-sm text-ink">
              <span className="font-bold">{included}</span> de {previewRows.length} filas seleccionadas para importar
              a <span className="font-semibold">{accountName}</span>.
            </p>
            {duplicates > 0 && (
              <p className="text-xs text-muted">
                {duplicates} {duplicates === 1 ? "se ve" : "se ven"} como posible duplicado de algo que ya
                registraste — quedaron sin marcar, pero puedes incluirlas si de verdad son nuevas.
              </p>
            )}
            {withErrors > 0 && (
              <p className="text-xs text-danger">
                {withErrors} {withErrors === 1 ? "fila no se pudo leer" : "filas no se pudieron leer"} (fecha o monto
                con un formato inesperado) — revisa el mapeo si son muchas.
              </p>
            )}
          </GlassCard>

          <div className="flex flex-col gap-2">
            {previewRows.map((r, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer ${
                  r.error ? "border-black/5 opacity-50" : r.isDuplicate ? "border-warning/30 bg-warning-soft/40" : "border-black/5 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={r.include}
                  disabled={!!r.error}
                  onChange={() => toggleRow(i)}
                  className="size-5 shrink-0 accent-[var(--color-primary)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{r.note || "(sin descripción)"}</p>
                  <p className="text-xs text-muted">
                    {r.error ?? r.date}
                    {r.isDuplicate && !r.error && " · posible duplicado"}
                  </p>
                </div>
                {!r.error && (
                  <p className={`text-sm font-semibold shrink-0 ${r.isExpense ? "text-danger" : "text-ink"}`}>
                    {r.isExpense ? "−" : "+"}
                    <Money value={r.amount} />
                  </p>
                )}
                <Badge tone={r.isExpense ? "danger" : "info"} className="shrink-0">
                  {r.isExpense ? "Gasto" : "Ingreso"}
                </Badge>
              </label>
            ))}
          </div>

          {error && (
            <p className="text-sm font-medium text-danger bg-danger-soft rounded-2xl px-3 py-2 flex items-center gap-2">
              <Icon name="alert" size={18} />
              {error}
            </p>
          )}

          <div className="flex gap-2 pb-2">
            <Button type="button" variant="secondary" onClick={() => setStep(2)} full>
              Atrás
            </Button>
            <Button type="button" onClick={handleConfirm} loading={confirming} disabled={included === 0} full>
              Importar {included > 0 ? `(${included})` : ""}
            </Button>
          </div>
        </>
      )}

      {step === 4 && (
        <GlassCard className="flex flex-col items-center gap-3 text-center py-8">
          <span className="grid place-items-center size-14 rounded-full bg-primary-soft text-primary">
            <Icon name="check" size={28} />
          </span>
          <div>
            <p className="font-bold text-ink text-lg">
              {importedCount} {importedCount === 1 ? "movimiento importado" : "movimientos importados"}
            </p>
            <p className="text-sm text-muted mt-1">Ya están en tu cuenta {accountName}.</p>
          </div>
          <div className="flex gap-2 w-full pt-2">
            <Button type="button" variant="secondary" onClick={reset} full>
              Importar otro archivo
            </Button>
            <a
              href="/movimientos"
              className="inline-flex items-center justify-center flex-1 rounded-full font-semibold min-h-11 px-4 text-[1.05rem] bg-gradient-brand text-white shadow-sm hover:brightness-[0.97] active:brightness-95"
            >
              Ver movimientos
            </a>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

/** Diferencia en días entre dos fechas ISO — sin líos de timezone, son
 *  strings "YYYY-MM-DD" comparados como fechas locales a mediodía. */
function dayDiff(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  return Math.round((da.getTime() - db.getTime()) / 86400000);
}
