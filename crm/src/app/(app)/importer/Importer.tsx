"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CONTACT_TYPES, INVOICE_KINDS, STAGES } from "@/lib/constants";
import { normalizeKey, parseAmount, parseCsv, parseDate, pick, toCsv } from "@/lib/csv";
import { contactName, formatEuro, newId } from "@/lib/format";
import type { ContactType, InvoiceKind, InvoiceStatus, Stage } from "@/lib/types";
import { ErrorText, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

interface ContactRow {
  line: number;
  company: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  siret: string;
  website: string;
  type: ContactType;
  stage: Stage;
  sector: string;
  source: string;
  tags: string[];
  notes: string;
  error?: string;
  duplicate?: boolean;
}

interface InvoiceRow {
  line: number;
  client_email: string;
  number: string;
  kind: InvoiceKind;
  title: string;
  description: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  total: number;
  error?: string;
  duplicate?: boolean;
}

const CONTACT_HEADER = ["entreprise", "prenom", "nom", "email", "telephone", "adresse", "code_postal", "ville", "siret", "site_web", "type", "etape", "secteur", "source", "etiquettes", "notes"];
const INVOICE_HEADER = ["email_client", "numero", "date_emission", "date_echeance", "montant", "statut", "date_paiement", "type", "objet", "description"];

/** Retrouve une valeur de liste à partir de son code ou de son libellé (« Gagné », « gagne »…). */
function matchOption<T extends string>(list: { value: T; label: string }[], raw: string, fallback: T): T {
  if (!raw) return fallback;
  const key = normalizeKey(raw);
  return list.find((o) => normalizeKey(o.value) === key || normalizeKey(o.label) === key)?.value ?? fallback;
}

function invoiceStatus(raw: string): InvoiceStatus {
  const k = normalizeKey(raw);
  if (!k) return "payee";
  if (k.startsWith("paye")) return "payee";
  if (k.startsWith("annul")) return "annulee";
  if (k.startsWith("brouillon")) return "brouillon";
  return "envoyee"; // envoyée, à encaisser, en retard, impayée…
}

function invoiceKind(raw: string): InvoiceKind {
  const k = normalizeKey(raw);
  if (k.includes("acompte")) return "acompte";
  if (k.includes("solde")) return "solde";
  return "facture";
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Importer({ existingEmails, existingNames, existingNumbers }: { existingEmails: string[]; existingNames: string[]; existingNumbers: string[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[] | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [contactsFile, setContactsFile] = useState("");
  const [invoicesFile, setInvoicesFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ contacts: number; invoices: number; total: number } | null>(null);

  const known = new Set(existingEmails.map((e) => e.toLowerCase()));
  const knownNames = new Set(existingNames.map(normalizeKey));
  const knownNumbers = new Set(existingNumbers);

  async function readContacts(file: File) {
    setResult(null);
    const rows = parseCsv(await file.text());
    const seen = new Set<string>();
    setContactsFile(file.name);
    setContacts(
      rows.map((r, i) => {
        const email = pick(r, "email", "e_mail", "courriel", "mail").toLowerCase();
        const c: ContactRow = {
          line: i + 2,
          company: pick(r, "entreprise", "societe", "raison_sociale", "company"),
          first_name: pick(r, "prenom", "first_name"),
          last_name: pick(r, "nom", "last_name", "contact"),
          email,
          phone: pick(r, "telephone", "tel", "portable", "phone"),
          address: pick(r, "adresse", "address"),
          postal_code: pick(r, "code_postal", "cp", "postal_code"),
          city: pick(r, "ville", "city"),
          siret: pick(r, "siret"),
          website: pick(r, "site_web", "site", "website"),
          type: matchOption(CONTACT_TYPES, pick(r, "type"), "prospect"),
          stage: matchOption(STAGES, pick(r, "etape", "stage"), "nouveau"),
          sector: pick(r, "secteur", "sector"),
          source: pick(r, "source"),
          tags: pick(r, "etiquettes", "tags").split(/[,|]/).map((t) => t.trim()).filter(Boolean),
          notes: pick(r, "notes", "note", "commentaire"),
        };
        if (!c.company && !c.first_name && !c.last_name) c.error = "Nom ou entreprise manquant";
        else if (email && seen.has(email)) c.error = "E-mail en double dans le fichier";
        else if (email && known.has(email)) c.duplicate = true;
        // Sans e-mail, on compare l'entreprise ou le nom complet.
        else if (!email && knownNames.has(normalizeKey(c.company || contactName(c)))) c.duplicate = true;
        if (email) seen.add(email);
        return c;
      }),
    );
  }

  async function readInvoices(file: File) {
    setResult(null);
    const rows = parseCsv(await file.text());
    const seen = new Set<string>();
    setInvoicesFile(file.name);
    setInvoices(
      rows.map((r, i) => {
        const status = invoiceStatus(pick(r, "statut", "status", "etat"));
        const issue = parseDate(pick(r, "date_emission", "date", "emission", "date_facture"));
        const total = parseAmount(pick(r, "montant", "montant_ttc", "ttc", "total"));
        const number = pick(r, "numero", "n_facture", "numero_facture", "number");
        const inv: InvoiceRow = {
          line: i + 2,
          client_email: pick(r, "email_client", "email", "client_email").toLowerCase(),
          number,
          kind: invoiceKind(pick(r, "type", "kind")),
          title: pick(r, "objet", "titre", "title"),
          description: pick(r, "description", "designation", "libelle"),
          status,
          issue_date: issue ?? "",
          due_date: parseDate(pick(r, "date_echeance", "echeance", "due_date")),
          paid_at: status === "payee" ? parseDate(pick(r, "date_paiement", "paye_le", "paid_at")) ?? issue : null,
          total: total ?? 0,
        };
        if (!number) inv.error = "Numéro manquant";
        else if (!inv.client_email) inv.error = "E-mail du client manquant";
        else if (!issue) inv.error = "Date d'émission illisible";
        else if (total === null) inv.error = "Montant illisible";
        else if (seen.has(number)) inv.error = "Numéro en double dans le fichier";
        else if (knownNumbers.has(number)) inv.duplicate = true;
        seen.add(number);
        return inv;
      }),
    );
  }

  // Une facture doit pointer vers un client existant ou présent dans le fichier clients.
  const fileEmails = new Set((contacts ?? []).filter((c) => !c.error).map((c) => c.email));
  const invoiceRows = (invoices ?? []).map((inv) =>
    !inv.error && !known.has(inv.client_email) && !fileEmails.has(inv.client_email)
      ? { ...inv, error: "Client introuvable (ajoutez-le au fichier clients)" }
      : inv,
  );

  const newContacts = (contacts ?? []).filter((c) => !c.error && !c.duplicate);
  const newInvoices = invoiceRows.filter((i) => !i.error && !i.duplicate);
  const invoiceErrors = invoiceRows.filter((i) => i.error).length;
  const contactErrors = (contacts ?? []).filter((c) => c.error).length;

  async function runImport() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      const source = (name: string) => `Importé depuis ${name || "un fichier CSV"}.`;

      if (newContacts.length) {
        const { data, error } = await supabase
          .from("contacts")
          .insert(newContacts.map(({ line: _l, error: _e, duplicate: _d, notes, ...c }) => ({ ...c, notes: [notes, source(contactsFile)].filter(Boolean).join("\n") })))
          .select("id");
        if (error) throw error;
        await supabase.from("activities").insert((data ?? []).map((c) => ({ contact_id: c.id, kind: "statut", content: "Contact importé" })));
      }

      if (newInvoices.length) {
        const { data: all, error: cErr } = await supabase.from("contacts").select("id, email, created_at").order("created_at");
        if (cErr) throw cErr;
        const idByEmail = new Map<string, string>();
        for (const c of all ?? []) if (c.email && !idByEmail.has(c.email.toLowerCase())) idByEmail.set(c.email.toLowerCase(), c.id);

        const payload = newInvoices.map((inv) => ({
          contact_id: idByEmail.get(inv.client_email) ?? null,
          number: inv.number,
          kind: inv.kind,
          title: inv.title,
          status: inv.status,
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          paid_at: inv.paid_at,
          total: inv.total,
          discount_percent: 0,
          items: [{ id: newId(), description: inv.description || inv.title || "Prestation", details: `Facture n° ${inv.number}`, quantity: 1, unit: "forfait", unit_price: inv.total }],
          notes: source(invoicesFile),
        }));
        const { error } = await supabase.from("invoices").insert(payload);
        if (error) throw error;
        await supabase.from("activities").insert(
          payload.map((p) => ({
            contact_id: p.contact_id,
            kind: "facture",
            content: `Facture ${p.number} importée · ${formatEuro(p.total)}${p.status === "payee" ? " · payée" : ""}`,
          })),
        );
      }

      setResult({ contacts: newContacts.length, invoices: newInvoices.length, total: newInvoices.reduce((s, i) => s + i.total, 0) });
      setContacts(null);
      setInvoices(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Importer" subtitle="Ajoutez vos clients et vos factures existants à partir de fichiers CSV (Excel, Henrri, Google Sheets…)." />

      {result && (
        <div className="card mb-6 flex flex-col gap-3 border-emerald-500/30 bg-emerald-500/10 p-5 sm:flex-row sm:items-center">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-300" />
          <p className="flex-1 text-sm text-emerald-100">
            Import terminé : <strong>{result.contacts}</strong> client(s) et <strong>{result.invoices}</strong> facture(s) ({formatEuro(result.total)}) ajoutés.
          </p>
          <div className="flex gap-2">
            <Link href="/contacts" className="btn-secondary btn-sm">Voir les contacts</Link>
            <Link href="/" className="btn-primary btn-sm">Tableau de bord</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DropZone
          title="1. Fichier clients"
          hint="Une ligne par client. L'e-mail sert à relier les factures et à éviter les doublons."
          fileName={contactsFile}
          onFile={readContacts}
          onClear={() => { setContacts(null); setContactsFile(""); }}
          onTemplate={() => download("modele-clients.csv", toCsv(CONTACT_HEADER, [["Entreprise Exemple", "Jean", "DUPONT", "contact@exemple.fr", "06 00 00 00 00", "1 rue de l'Exemple", "67000", "Strasbourg", "", "https://exemple.fr", "client", "gagne", "Plâtrerie", "Bouche-à-oreille", "site vitrine", ""]]))}
        />
        <DropZone
          title="2. Fichier factures (facultatif)"
          hint="Une ligne par facture, reliée au client par son e-mail. Statut : payée, envoyée, brouillon ou annulée."
          fileName={invoicesFile}
          onFile={readInvoices}
          onClear={() => { setInvoices(null); setInvoicesFile(""); }}
          onTemplate={() => download("modele-factures.csv", toCsv(INVOICE_HEADER, [["contact@exemple.fr", "FAC-0001", "15/01/2026", "", "1200,00", "payée", "15/01/2026", "facture", "Site vitrine", "Création du site vitrine"]]))}
        />
      </div>

      {(contacts || invoices) && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Clients à ajouter" value={newContacts.length} />
            <Stat label="Clients déjà présents" value={(contacts ?? []).filter((c) => c.duplicate).length} muted />
            <Stat label="Factures à ajouter" value={newInvoices.length} sub={formatEuro(newInvoices.reduce((s, i) => s + i.total, 0))} />
            <Stat label="Lignes en erreur" value={contactErrors + invoiceErrors} alert={contactErrors + invoiceErrors > 0} />
          </div>

          {contacts && contacts.length > 0 && (
            <Preview title={`Clients · ${contacts.length} ligne(s)`}>
              <thead><tr><th className="table-head">Ligne</th><th className="table-head">Client</th><th className="table-head">E-mail</th><th className="table-head">Ville</th><th className="table-head">Type / étape</th><th className="table-head">État</th></tr></thead>
              <tbody className="divide-y divide-white/[0.04]">
                {contacts.map((c) => (
                  <tr key={c.line}>
                    <td className="table-cell text-slate-500">{c.line}</td>
                    <td className="table-cell text-slate-100">{c.company || contactName(c)}{c.company && (c.first_name || c.last_name) && <span className="text-slate-500"> · {contactName(c)}</span>}</td>
                    <td className="table-cell text-slate-400">{c.email || "—"}</td>
                    <td className="table-cell text-slate-400">{c.city || "—"}</td>
                    <td className="table-cell text-slate-400">{CONTACT_TYPES.find((t) => t.value === c.type)?.label} · {STAGES.find((s) => s.value === c.stage)?.label}</td>
                    <td className="table-cell"><RowState error={c.error} duplicate={c.duplicate} /></td>
                  </tr>
                ))}
              </tbody>
            </Preview>
          )}

          {invoiceRows.length > 0 && (
            <Preview title={`Factures · ${invoiceRows.length} ligne(s)`}>
              <thead><tr><th className="table-head">Ligne</th><th className="table-head">Numéro</th><th className="table-head">Client</th><th className="table-head">Date</th><th className="table-head">Type / statut</th><th className="table-head text-right">Montant</th><th className="table-head">État</th></tr></thead>
              <tbody className="divide-y divide-white/[0.04]">
                {invoiceRows.map((i) => (
                  <tr key={i.line}>
                    <td className="table-cell text-slate-500">{i.line}</td>
                    <td className="table-cell text-slate-100">{i.number || "—"}</td>
                    <td className="table-cell text-slate-400">{i.client_email || "—"}</td>
                    <td className="table-cell text-slate-400">{i.issue_date || "—"}</td>
                    <td className="table-cell text-slate-400">{INVOICE_KINDS[i.kind]} · {i.status === "payee" ? "Payée" : i.status === "envoyee" ? "À encaisser" : i.status === "annulee" ? "Annulée" : "Brouillon"}</td>
                    <td className="table-cell text-right text-slate-100">{formatEuro(i.total)}</td>
                    <td className="table-cell"><RowState error={i.error} duplicate={i.duplicate} /></td>
                  </tr>
                ))}
              </tbody>
            </Preview>
          )}

          <div className="mt-6 flex flex-col items-end gap-3">
            <ErrorText error={error} />
            <p className="text-right text-xs text-slate-500">Les lignes en erreur et les éléments déjà présents (même e-mail, même numéro de facture) sont ignorés.</p>
            <button className="btn-primary" onClick={runImport} disabled={busy || newContacts.length + newInvoices.length === 0}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer {newContacts.length} client(s) et {newInvoices.length} facture(s)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DropZone({ title, hint, fileName, onFile, onClear, onTemplate }: {
  title: string;
  hint: string;
  fileName: string;
  onFile: (f: File) => void;
  onClear: () => void;
  onTemplate: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <section className="card card-pad">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </div>
        <button className="btn-ghost btn-sm shrink-0" onClick={onTemplate}><Download className="h-3.5 w-3.5" /> Modèle</button>
      </div>
      {fileName ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <FileSpreadsheet className="h-5 w-5 text-emerald-300" />
          <span className="flex-1 truncate text-sm text-slate-200">{fileName}</span>
          <button className="btn-ghost btn-sm px-2" onClick={onClear} aria-label="Retirer le fichier"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <div
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm transition",
            over ? "border-brand-400 bg-brand-500/10 text-brand-200" : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300",
          )}
        >
          <Upload className="mb-2 h-5 w-5" />
          Glissez un fichier .csv ou cliquez pour le choisir
        </div>
      )}
      <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </section>
  );
}

function Stat({ label, value, sub, muted, alert }: { label: string; value: number; sub?: string; muted?: boolean; alert?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("font-display text-2xl font-semibold", alert ? "text-rose-300" : muted ? "text-slate-400" : "text-white")}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Preview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mt-6 overflow-hidden">
      <h3 className="border-b border-white/[0.06] px-4 py-3 text-sm font-semibold text-white">{title}</h3>
      <div className="max-h-96 overflow-auto">
        <table className="w-full min-w-[760px]">{children}</table>
      </div>
    </section>
  );
}

function RowState({ error, duplicate }: { error?: string; duplicate?: boolean }) {
  if (error) return <span className="inline-flex items-center gap-1 text-xs text-rose-300"><AlertTriangle className="h-3.5 w-3.5" /> {error}</span>;
  if (duplicate) return <span className="text-xs text-slate-500">Déjà présent, ignoré</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Prêt</span>;
}
