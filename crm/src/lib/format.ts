import type { Contact, DocumentContact, Invoice, LineItem } from "./types";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const euroRounded = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const formatEuro = (n: number | null | undefined) => euro.format(Number(n ?? 0));
export const formatEuroShort = (n: number | null | undefined) => euroRounded.format(Number(n ?? 0));

export function formatDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("fr-FR", opts);
}

export const formatLongDate = (d: string | null | undefined) =>
  formatDate(d, { day: "numeric", month: "long", year: "numeric" });

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/** Date du jour au format AAAA-MM-JJ (fuseau local). */
export function today() {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function contactName(c: Partial<Contact | DocumentContact> | null | undefined) {
  if (!c) return "Sans contact";
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return full || c.company || "Sans nom";
}

export function initials(c: Partial<Contact> | null | undefined) {
  const name = contactName(c);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function computeTotals(items: LineItem[], discountPercent = 0, depositPercent = 0) {
  const subtotal = round2(items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0));
  const discount = round2((subtotal * Number(discountPercent || 0)) / 100);
  const total = round2(subtotal - discount);
  const deposit = round2((total * Number(depositPercent || 0)) / 100);
  return { subtotal, discount, total, deposit };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Une facture « envoyée » dont l'échéance est passée est en retard. */
export function invoiceDisplayStatus(inv: Pick<Invoice, "status" | "due_date">) {
  if (inv.status === "envoyee" && inv.due_date && inv.due_date < today()) return "en_retard" as const;
  return inv.status;
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
