"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, Loader2, Mail, Pencil, Printer, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { INVOICE_KINDS, INVOICE_STATUSES } from "@/lib/constants";
import { contactName, formatDate, formatEuro, invoiceDisplayStatus, today } from "@/lib/format";
import type { Contact, Invoice, Offer, Profile, Quote } from "@/lib/types";
import DocumentEditor from "@/components/DocumentEditor";
import DocumentPaper from "@/components/DocumentPaper";
import { ErrorText, Field, Modal, StatusBadge } from "@/components/ui";

export default function InvoiceDetail({
  invoice,
  contacts,
  offers,
  profile,
  quote,
}: {
  invoice: Invoice;
  contacts: Contact[];
  offers: Offer[];
  profile: Profile | null;
  quote: Pick<Quote, "id" | "number"> | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(invoice.status === "brouillon");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(today());

  const contact = contacts.find((c) => c.id === invoice.contact_id) ?? null;
  const display = invoiceDisplayStatus(invoice);

  async function update(name: string, patch: Partial<Invoice>, message: string) {
    setBusy(name);
    setError(null);
    const { error } = await supabase.from("invoices").update(patch).eq("id", invoice.id);
    if (error) setError(error.message);
    else await supabase.from("activities").insert({ contact_id: invoice.contact_id, kind: "facture", content: message });
    setBusy(null);
    setEditing(false);
    setPayOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Supprimer la facture brouillon ${invoice.number} ?\nSon numéro ne sera pas réattribué : préférez « Annuler » si elle a déjà été transmise.`)) return;
    setBusy("delete");
    const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
    setBusy(null);
    if (error) return setError(error.message);
    router.push("/factures");
    router.refresh();
  }

  const mailto = contact?.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(`Facture ${invoice.number}`)}&body=${encodeURIComponent(
        `Bonjour ${contact.first_name || ""},\n\nVeuillez trouver ci-joint la facture ${invoice.number} d'un montant de ${formatEuro(invoice.total)}${invoice.due_date ? `, à régler avant le ${formatDate(invoice.due_date)}` : ""}.\n${profile?.iban ? `\nIBAN : ${profile.iban}${profile.bic ? `\nBIC : ${profile.bic}` : ""}\n` : ""}\nMerci pour votre confiance.\n\nBien cordialement,\n${[profile?.first_name, profile?.last_name].filter(Boolean).join(" ")}\n${profile?.company_name ?? ""}`,
      )}`
    : null;

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/factures" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Factures
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white">{INVOICE_KINDS[invoice.kind]} {invoice.number}</h2>
            <StatusBadge list={INVOICE_STATUSES} value={display} />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {contact ? <Link href={`/contacts/${contact.id}`} className="hover:text-brand-200">{contactName(contact)}</Link> : "Sans client"}
            {" · "}{formatEuro(invoice.total)}
            {quote && <> · <Link href={`/devis/${quote.id}`} className="hover:text-brand-200">devis {quote.number}</Link></>}
            {invoice.paid_at && <> · payée le {formatDate(invoice.paid_at)}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "brouillon" && (
            <button className="btn-primary" disabled={!!busy} onClick={() => update("send", { status: "envoyee" }, `Facture ${invoice.number} émise · ${formatEuro(invoice.total)}`)}>
              {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Valider et émettre
            </button>
          )}
          {invoice.status === "envoyee" && (
            <button className="btn-primary" onClick={() => setPayOpen(true)}><CheckCircle2 className="h-4 w-4" /> Marquer payée</button>
          )}
          {invoice.status === "payee" && (
            <button className="btn-secondary" disabled={!!busy} onClick={() => update("unpay", { status: "envoyee", paid_at: null }, `Paiement de la facture ${invoice.number} annulé`)}>
              Annuler le paiement
            </button>
          )}
          {mailto && invoice.status !== "brouillon" && <a href={mailto} className="btn-secondary"><Mail className="h-4 w-4" /> E-mail</a>}
          {invoice.status === "brouillon" && !editing && (
            <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Modifier</button>
          )}
          <a href={`/imprimer/facture/${invoice.id}`} target="_blank" rel="noreferrer" className="btn-secondary"><Printer className="h-4 w-4" /> PDF</a>
          {invoice.status === "envoyee" && (
            <button className="btn-secondary" disabled={!!busy} title="Annuler la facture"
              onClick={() => confirm("Annuler cette facture ? Elle restera visible avec le statut « Annulée ».") && update("cancel", { status: "annulee" }, `Facture ${invoice.number} annulée`)}>
              <Ban className="h-4 w-4" />
            </button>
          )}
          {invoice.status === "brouillon" && (
            <button className="btn-danger" onClick={remove} disabled={!!busy} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      </div>

      <div className="mb-4"><ErrorText error={error} /></div>

      {editing && invoice.status === "brouillon" ? (
        <DocumentEditor mode="invoice" invoice={invoice} contacts={contacts} offers={offers} profile={profile} />
      ) : (
        <DocumentPaper
          profile={profile}
          contact={contact}
          data={{
            docType: INVOICE_KINDS[invoice.kind],
            number: invoice.number,
            title: invoice.title,
            issue_date: invoice.issue_date,
            limit_date: invoice.due_date,
            limit_label: "Échéance",
            items: invoice.items,
            discount_percent: invoice.discount_percent,
            notes: invoice.notes,
            terms: invoice.terms,
            reference: quote ? `Réf. devis ${quote.number}` : undefined,
            paid_at: invoice.paid_at,
            showBankDetails: invoice.status !== "payee",
          }}
        />
      )}

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Enregistrer le paiement">
        <div className="space-y-4">
          <Field label="Date d'encaissement">
            <input type="date" className="input" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setPayOpen(false)}>Annuler</button>
            <button className="btn-primary" disabled={!!busy || !paidAt}
              onClick={() => update("pay", { status: "payee", paid_at: paidAt }, `Facture ${invoice.number} payée · ${formatEuro(invoice.total)}`)}>
              {busy === "pay" && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
