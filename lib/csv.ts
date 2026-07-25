// Parser de CSV mínimo, sin dependencias — bancos dominicanos exportan CSVs
// simples (coma o punto y coma, con o sin comillas), no hace falta una
// librería completa para esto.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** Detecta el separador probando cuál produce más columnas consistentes en
 *  la primera línea — evita pedirle al usuario que lo especifique. */
function detectDelimiter(firstLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    const count = firstLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** Parsea una línea respetando campos entre comillas (que pueden contener
 *  el separador o comillas escapadas como ""). */
function parseLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      out.push(field.trim());
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field.trim());
  return out;
}

/** Parsea un CSV completo. La primera fila se asume encabezado. Ignora
 *  líneas vacías (comunes al final del archivo). */
export function parseCsv(text: string): ParsedCsv {
  // \r\n y \r sueltos (exports de Windows/bancos viejos) — normalizar antes
  // de partir por línea.
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter);
  const rows = lines.slice(1).map((l) => parseLine(l, delimiter));
  return { headers, rows };
}

/** Convierte un monto en texto a número, tolerando separador de miles y
 *  decimal configurable (bancos dominicanos varían: "1,234.56" o
 *  "1.234,56"), signo, y símbolo de moneda pegado. */
export function parseCsvAmount(raw: string, decimalSeparator: "." | ","): number {
  let s = raw.trim().replace(/[^\d.,\-()]/g, "");
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\-]/g, "");

  if (decimalSeparator === ",") {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

/** Convierte una fecha en texto a ISO "YYYY-MM-DD" según el formato
 *  declarado en el perfil de importación. */
export function parseCsvDate(raw: string, format: string): string | null {
  const s = raw.trim();
  if (format === "YYYY-MM-DD") {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  const [, a, b] = m;
  let year = m[3];
  if (year.length === 2) year = `20${year}`;
  const day = format === "MM/DD/YYYY" ? b : a;
  const month = format === "MM/DD/YYYY" ? a : b;
  const dd = day.padStart(2, "0");
  const mm = month.padStart(2, "0");
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return `${year}-${mm}-${dd}`;
}
