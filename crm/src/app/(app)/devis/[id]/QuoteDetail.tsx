"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Files,
  Link2,
  Loader2,
  Mail,
  Pencil,
  Printer,
  Receipt,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { INVOICE_KINDS, INVOICE_STATUSES, QUOTE_STATUSES } from "@/lib/constants";
import { addDays, computeTotals, contactName, formatDate, formatEuro, invoiceDisplayStatus, newId, round2, today } from "@/lib/format";
import type { Contact, Invoice, InvoiceKind, LineItem, Offer, Profile, Quote } from "@/lib/types";
import DocumentEditor from "@/components/DocumentEditor";
import DocumentPaper from "@/components/DocumentPaper";
import { ErrorText, Modal, StatusBadge } from "@/components/ui";

export default function QuoteDetail({
  quote,
  contacts,
  offers,
  profile,
  invoices,
  siteUrl,
}: {
  quote: Quote;
  contacts: Contact[];
  offers: Offer[];
  profile: Profile | null;
  invoices: Invoice[];
  siteUrl: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(quote.status === "brouillon");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const contact = contacts.find((c) => c.id === quote.contact_id) ?? null;
  const origin = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const signUrl = `${origin}/signer/${quote.public_token}`;
  const locked = quote.status === "accepte";

  async function log(content: string) {
    await supabase.from("activities").insert({ contact_id: quote.contact_id, kind: "devis", content });
  }

  async function run(name: string, fn: () => Promise<string | void>) {
    setBusy(name);
    setError(null);
    try {
      const err = await fn();
      if (err) setError(err);
    } finally {
      setBusy(null);
    }
  }

  const markSent = () =>
    run("send", async () => {
      if (quote.status === "brouillon") {
        const { error } = await supabase.from("quotes").update({ status: "envoye", sent_at: new Date().toISOString() }).eq("id", quote.id);
        if (error) return error.message;
        await log(`Devis ${quote.number} envoyé · ${formatEuro(quote.total)}`);
        if (contact && ["nouveau", "contacte", "qualifie"].includes(contact.stage)) {
          await supabase.from("contacts").update({ stage: "proposition" }).eq("id", contact.id);
        }
      }
      setSendOpen(true);
      setEditing(false);
      router.refresh();
    });

  const setStatus = (status: "accepte" | "refuse" | "brouillon") =>
    run(status, async () => {
      const patch: Partial<Quote> =
        status === "accepte" ? { status, signed_at: new Date().toISOString(), signer_name: quote.signer_name ?? "Signature manuscrite" }
          : status === "refuse" ? { status, refused_at: new Date().toISOString() }
          : { status };
      const { error } = await supabase.from("quotes").update(patch).eq("id", quote.id);
      if (error) return error.message;
      if (status === "accepte" && contact) {
        await supabase.from("contacts").update({ stage: "gagne", type: "client" }).eq("id", contact.id);
      }
      await log(`Devis ${quote.number} ${status === "accepte" ? "accepté" : status === "refuse" ? "refusé" : "repassé en brouillon"}`);
      if (status === "brouillon") setEditing(true);
      router.refresh();
    });

  const duplicate = () =>
    run("duplicate", async () => {
      const { data: number, error: numErr } = await supabase.rpc("next_document_number", { p_kind: "devis" });
      if (numErr || !number) return numErr?.message ?? "Numérotation impossible.";
      const issue = today();
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          number,
          contact_id: quote.contact_id,
          title: quote.title,
          issue_date: issue,
          valid_until: addDays(issue, profile?.quote_validity_days ?? 30),
          items: quote.items.map((i) => ({ ...i, id: newId() })),
          discount_percent: quote.discount_percent,
          deposit_percent: quote.deposit_percent,
          total: quote.total,
          notes: quote.notes,
          terms: quote.terms,
        })
        .select("id")
        .single();
      if (error || !data) return error?.message ?? "Duplication impossible.";
      router.push(`/devis/${data.id}`);
    });

  const remove = () =>
    run("delete", async () => {
      if (!confirm(`Supprimer le devis ${quote.number} ?`)) return;
      const { error } = await supabase.from("quotes").delete().eq("id", quote.id);
      if (error) return error.message;
      router.push("/devis");
      router.refresh();
    });

  const convert = (kind: InvoiceKind) =>
    run("convert", async () => {
      const { total, deposit } = computeTotals(quote.items, quote.discount_percent, quote.deposit_percent);
      let items: LineItem[];
      let discount = Number(quote.discount_percent);

      if (kind === "acompte") {
        items = [{
          id: newId(),
          description: `Acompte de ${quote.deposit_percent} % — ${quote.title || "devis " + quote.number}`,
          details: `Selon devis ${quote.number} du ${formatDate(quote.issue_date)} d'un montant total de ${formatEuro(total)}.`,
          quantity: 1,
          unit: "forfait",
          unit_price: deposit,
        }];
        discount = 0;
      } else {
        items = quote.items.map((i) => ({ ...i, id: newId() }));
        if (kind === "solde") {
          // Le solde déduit les acomptes déjà facturés : on applique la remise ligne par ligne
          // pour que la déduction s'impute sur le total net.
          if (discount > 0) {
            items = items.map((i) => ({ ...i, unit_price: round2(Number(i.unit_price) * (1 - discount / 100)) }));
            discount = 0;
          }
          for (const inv of invoices.filter((x) => x.kind === "acompte" && x.status !== "annulee")) {
            items.push({ id: newId(), description: `Acompte déjà facturé (${inv.number})`, details: "", quantity: 1, unit: "forfait", unit_price: -Number(inv.total) });
          }
        }
      }

      const { data: number, error: numErr } = await supabase.rpc("next_document_number", { p_kind: "facture" });
      if (numErr || !number) return numErr?.message ?? "Numérotation impossible.";
      const issue = today();
      const invoiceTotal = computeTotals(items, discount).total;
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          number,
          kind,
          quote_id: quote.id,
          contact_id: quote.contact_id,
          title: quote.title,
          issue_date: issue,
          due_date: addDays(issue, profile?.payment_terms_days ?? 30),
          items,
          discount_percent: discount,
          total: invoiceTotal,
          notes: `Selon devis ${quote.number} accepté le ${formatDate(quote.signed_at ?? quote.issue_date)}.`,
          terms: profile?.invoice_terms ?? "",
        })
        .select("id")
        .single();
      if (error || !data) return error?.message ?? "Création de la facture impossible.";
      await supabase.from("activities").insert({
        contact_id: quote.contact_id,
        kind: "facture",
        content: `${INVOICE_KINDS[kind]} ${number} créée depuis le devis ${quote.number} · ${formatEuro(invoiceTotal)}`,
      });
      router.push(`/factures/${data.id}`);
    });

  async function copyLink() {
    await navigator.clipboard.writeText(signUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mailto = contact?.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(`Votre devis ${quote.number}${quote.title ? " — " + quote.title : ""}`)}&body=${encodeURIComponent(
        `Bonjour ${contact.first_name || ""},\n\nComme convenu, voici votre devis ${quote.number} d'un montant de ${formatEuro(quote.total)}.\n\nVous pouvez le consulter et le signer en ligne ici :\n${signUrl}\n\nJe reste à votre disposition pour toute question.\n\nBien cordialement,\n${[profile?.first_name, profile?.last_name].filter(Boolean).join(" ")}\n${profile?.company_name ?? ""}\n${profile?.phone ?? ""}`,
      )}`
    : null;

  const hasDeposit = invoices.some((i) => i.kind === "acompte" && i.status !== "annulee");

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/devis" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Devis
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white">Devis {quote.number}</h2>
            <StatusBadge list={QUOTE_STATUSES} value={quote.status} />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {contact ? <Link href={`/contacts/${contact.id}`} className="hover:text-brand-200">{contactName(contact)}</Link> : "Sans client"}
            {" · "}{formatEuro(quote.total)}
            {quote.signed_at && <> · signé le {formatDate(quote.signed_at)}{quote.signer_name ? ` par ${quote.signer_name}` : ""}</>}
            {quote.refused_at && <> · refusé le {formatDate(quote.refused_at)}{quote.refusal_reason ? ` (« ${quote.refusal_reason} »)` : ""}</>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {quote.status === "brouillon" && (
            <button className="btn-primary" onClick={markSent} disabled={!!busy}>
              {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer au client
            </button>
          )}
          {quote.status === "envoye" && (
            <>
              <button className="btn-secondary" onClick={() => setSendOpen(true)}><Link2 className="h-4 w-4" /> Lien de signature</button>
              <button className="btn-secondary" onClick={() => setStatus("accepte")} disabled={!!busy}><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Accepté</button>
              <button className="btn-secondary" onClick={() => setStatus("refuse")} disabled={!!busy}><XCircle className="h-4 w-4 text-rose-400" /> Refusé</button>
            </>
          )}
          {quote.status === "accepte" && (
            <button className="btn-primary" onClick={() => setConvertOpen(true)} disabled={!!busy}>
              <Receipt className="h-4 w-4" /> Facturer
            </button>
          )}
          {!locked && !editing && (
            <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Modifier</button>
          )}
          {(quote.status === "refuse" || quote.status === "expire") && (
            <button className="btn-secondary" onClick={() => setStatus("brouillon")} disabled={!!busy}>Repasser en brouillon</button>
          )}
          <a href={`/imprimer/devis/${quote.id}`} target="_blank" rel="noreferrer" className="btn-secondary"><Printer className="h-4 w-4" /> PDF</a>
          <button className="btn-secondary" onClick={duplicate} disabled={!!busy} title="Dupliquer"><Files className="h-4 w-4" /></button>
          {!locked && (
            <button className="btn-danger" onClick={remove} disabled={!!busy} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      </div>

      <div className="mb-4"><ErrorText error={error} /></div>

      {invoices.length > 0 && (
        <div className="card mb-6 p-4">
          <p className="mb-2 text-sm font-medium text-white">Factures liées</p>
          <div className="flex flex-wrap gap-2">
            {invoices.map((i) => (
              <Link key={i.id} href={`/factures/${i.id}`} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/[0.03]">
                <span className="text-slate-200">{i.number}</span>
                <span className="text-slate-500">{INVOICE_KINDS[i.kind]}</span>
                <StatusBadge list={INVOICE_STATUSES} value={invoiceDisplayStatus(i)} />
                <span className="font-medium text-slate-100">{formatEuro(i.total)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {editing && !locked ? (
        <DocumentEditor mode="quote" quote={quote} contacts={contacts} offers={offers} profile={profile} />
      ) : (
        <DocumentPaper
          profile={profile}
          contact={contact}
          data={{
            docType: "Devis",
            number: quote.number,
            title: quote.title,
            issue_date: quote.issue_date,
            limit_date: quote.valid_until,
            limit_label: "Valable jusqu'au",
            items: quote.items,
            discount_percent: quote.discount_percent,
            deposit_percent: quote.deposit_percent,
            notes: quote.notes,
            terms: quote.terms,
            showSignatureBox: true,
            signature: quote.signed_at ? { name: quote.signer_name, date: quote.signed_at, image: quote.signature } : null,
          }}
        />
      )}

      <Modal open={sendOpen} onClose={() => setSendOpen(false)} title="Envoyer le devis au client">
        <div className="space-y-4 text-sm">
          <p className="text-slate-400">
            Votre client peut consulter, télécharger et <strong className="text-slate-200">signer en ligne</strong> le devis via ce lien personnel.
            Dès qu&apos;il signe, le devis passe en « Accepté » et le contact devient client.
          </p>
          <div className="flex gap-2">
            <input className="input font-mono text-xs" readOnly value={signUrl} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn-secondary shrink-0" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <a href={signUrl} target="_blank" rel="noreferrer" className="btn-ghost">Voir la page client</a>
            {mailto ? (
              <a href={mailto} className="btn-primary"><Mail className="h-4 w-4" /> Ouvrir l&apos;e-mail pré-rempli</a>
            ) : (
              <span className="text-xs text-slate-500">Ajoutez un e-mail au contact pour préparer l&apos;envoi.</span>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Créer une facture">
        <div className="space-y-3">
          <ConvertOption title="Facture totale" text={`Reprend toutes les lignes du devis · ${formatEuro(quote.total)}`} onClick={() => convert("facture")} disabled={!!busy} />
          {Number(quote.deposit_percent) > 0 && (
            <ConvertOption
              title={`Facture d'acompte (${quote.deposit_percent} %)`}
              text={formatEuro(computeTotals(quote.items, quote.discount_percent, quote.deposit_percent).deposit)}
              onClick={() => convert("acompte")}
              disabled={!!busy}
            />
          )}
          {hasDeposit && (
            <ConvertOption title="Facture de solde" text="Toutes les lignes, moins les acomptes déjà facturés" onClick={() => convert("solde")} disabled={!!busy} />
          )}
          {busy === "convert" && <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Création…</p>}
        </div>
      </Modal>
    </div>
  );
}

function ConvertOption({ title, text, onClick, disabled }: { title: string; text: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-brand-400/40 hover:bg-brand-500/[0.06] disabled:opacity-50">
      <p className="font-medium text-white">{title}</p>
      <p className="text-sm text-slate-400">{text}</p>
    </button>
  );
}
