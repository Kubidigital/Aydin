/**
 * Lecture de fichiers CSV exportés par Excel, Henrri, Google Sheets…
 * Gère le BOM UTF-8, les séparateurs « ; » ou « , » et les champs entre guillemets.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...data] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) return [];
  const keys = header.map(normalizeKey);
  return data.map((r) => Object.fromEntries(keys.map((k, idx) => [k, (r[idx] ?? "").trim()])));
}

/** « Code postal » → « code_postal », « Échéance » → « echeance ». */
export function normalizeKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Première valeur non vide parmi plusieurs noms de colonnes possibles. */
export function pick(row: Record<string, string>, ...names: string[]) {
  for (const n of names) {
    const v = row[normalizeKey(n)];
    if (v) return v;
  }
  return "";
}

/** « 1 100,00 € », « 1100.00 » → 1100 ; null si illisible. */
export function parseAmount(s: string): number | null {
  if (!s) return null;
  let v = s.replace(/[€\s  ]|EUR/gi, "");
  if (v.includes(",") && v.includes(".")) v = v.replace(/\./g, "");
  v = v.replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** « 2026-04-28 » ou « 28/04/2026 » → « 2026-04-28 » ; null si illisible. */
export function parseDate(s: string): string | null {
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export function toCsv(header: string[], rows: string[][]) {
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}
