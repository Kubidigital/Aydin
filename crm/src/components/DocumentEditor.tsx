"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, Loader2, Package, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { INVOICE_KINDS, UNITS } from "@/lib/constants";
import { addDays, computeTotals, contactName, formatEuro, newId, today } from "@/lib/format";
import type { Contact, Invoice, InvoiceKind, LineItem, Offer, Profile, Quote } from "@/lib/types";
import DocumentPaper from "./DocumentPaper";
import { ErrorText, Field } from "./ui";
import { cn } from "@/lib/cn";

type Mode = "quote" | "invoice";

interface Draft {
  contact_id: string;
  title: string;
  issue_date: string;
  limit_date: string;
  items: LineItem[];
  discount_percent: number;
  deposit_percent: number;
  notes: string;
  terms: string;
  kind: InvoiceKind;
}

const emptyLine = (): LineItem => ({ id: newId(), description: "", details: "", quantity: 1, unit: "forfait", unit_price: 0 });

export default function DocumentEditor({
  mode,
  quote,
  invoice,
  contacts,
  offers,
  profile,
  defaultContactId,
}: {
  mode: Mode;
  quote?: Quote;
  invoice?: Invoice;
  contacts: Contact[];
  offers: Offer[];
  profile: Profile | null;
  defaultContactId?: string;
}) {
  const router = useRouter();
  const existing = mode === "quote" ? quote : invoice;
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [d, setD] = useState<Draft>(() => {
    const issue = today();
    if (quote)
      return {
        contact_id: quote.contact_id ?? "",
        title: quote.title,
        issue_date: quote.issue_date,
        limit_date: quote.valid_until ?? "",
        items: quote.items ?? [],
        discount_percent: Number(quote.discount_percent),
        deposit_percent: Number(quote.deposit_percent),
        notes: quote.notes,
        terms: quote.terms,
        kind: "facture",
      };
    if (invoice)
      return {
        contact_id: invoice.contact_id ?? "",
        title: invoice.title,
        issue_date: invoice.issue_date,
        limit_date: invoice.due_date ?? "",
        items: invoice.items ?? [],
        discount_percent: Number(invoice.discount_percent),
        deposit_percent: 0,
        notes: invoice.notes,
        terms: invoice.terms,
        kind: invoice.kind,
      };
    return {
      contact_id: defaultContactId ?? "",
      title: "",
      issue_date: issue,
      limit_date: addDays(issue, mode === "quote" ? profile?.quote_validity_days ?? 30 : profile?.payment_terms_days ?? 30),
      items: [emptyLine()],
      discount_percent: 0,
      deposit_percent: mode === "quote" ? Number(profile?.deposit_percent ?? 30) : 0,
      notes: "",
      terms: (mode === "quote" ? profile?.quote_terms : profile?.invoice_terms) ?? "",
      kind: "facture",
    };
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((v) => ({ ...v, [key]: value }));
  const setItem = (id: string, patch: Partial<LineItem>) =>
    setD((v) => ({ ...v, items: v.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const moveItem = (idx: number, dir: -1 | 1) =>
    setD((v) => {
      const items = [...v.items];
      const target = idx + dir;
      if (target < 0 || target >= items.length) return v;
      [items[idx], items[target]] = [items[target], items[idx]];
      return { ...v, items };
    });

  function addOffer(offerId: string) {
    const o = offers.find((x) => x.id === offerId);
    if (!o) return;
    const line: LineItem = { id: newId(), description: o.name, details: o.description, quantity: 1, unit: o.unit, unit_price: Number(o.unit_price) };
    setD((v) => ({
      ...v,
      // Remplace la première ligne si elle est encore vide
      items: v.items.length === 1 && !v.items[0].description && !v.items[0].unit_price ? [line] : [...v.items, line],
      title: v.title || o.name,
    }));
  }

  const totals = computeTotals(d.items, d.discount_percent, d.deposit_percent);
  const contact = useMemo(() => contacts.find((c) => c.id === d.contact_id) ?? null, [contacts, d.contact_id]);
  const activeOffers = offers.filter((o) => o.active);

  async function save() {
    setError(null);
    if (!d.contact_id) return setError("Sélectionnez un client.");
    const items = d.items.filter((i) => i.description.trim() || Number(i.unit_price));
    if (!items.length) return setError("Ajoutez au moins une ligne.");

    setSaving(true);
    const supabase = createClient();
    const common = {
      contact_id: d.contact_id,
      title: d.title.trim(),
      issue_date: d.issue_date,
      items: items.map((i) => ({ ...i, quantity: Number(i.quantity) || 0, unit_price: Number(i.unit_price) || 0 })),
      discount_percent: Number(d.discount_percent) || 0,
      total: computeTotals(items, d.discount_percent).total,
      notes: d.notes,
      terms: d.terms,
    };
    const record =
      mode === "quote"
        ? { ...common, valid_until: d.limit_date || null, deposit_percent: Number(d.deposit_percent) || 0 }
        : { ...common, due_date: d.limit_date || null, kind: d.kind };
    const table = mode === "quote" ? "quotes" : "invoices";

    let id = existing?.id;
    if (existing) {
      const { error } = await supabase.from(table).update(record).eq("id", existing.id);
      if (error) {
        setSaving(false);
        return setError(error.message);
      }
    } else {
      const { data: number, error: numErr } = await supabase.rpc("next_document_number", { p_kind: mode === "quote" ? "devis" : "facture" });
      if (numErr || !number) {
        setSaving(false);
        return setError(numErr?.message ?? "Numérotation impossible.");
      }
      const { data, error } = await supabase.from(table).insert({ ...record, number }).select("id").single();
      if (error || !data) {
        setSaving(false);
        return setError(error?.message ?? "Création impossible.");
      }
      id = data.id;
      await supabase.from("activities").insert({
        contact_id: d.contact_id,
        kind: mode === "quote" ? "devis" : "facture",
        content: `${mode === "quote" ? "Devis" : "Facture"} ${number} créé(e) · ${formatEuro(record.total)}`,
      });
    }
    setSaving(false);
    router.push(mode === "quote" ? `/devis/${id}` : `/factures/${id}`);
    router.refresh();
  }

  const docType = mode === "quote" ? "Devis" : INVOICE_KINDS[d.kind];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <button className={cn("btn btn-sm", view === "edit" ? "bg-white/[0.08] text-white" : "text-slate-400")} onClick={() => setView("edit")}>
            <Pencil className="h-3.5 w-3.5" /> Édition
          </button>
          <button className={cn("btn btn-sm", view === "preview" ? "bg-white/[0.08] text-white" : "text-slate-400")} onClick={() => setView("preview")}>
            <Eye className="h-3.5 w-3.5" /> Aperçu
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-400">Total : <strong className="text-white">{formatEuro(totals.total)}</strong></span>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>
      <div className="mb-4"><ErrorText error={error} /></div>

      {view === "preview" ? (
        <DocumentPaper
          profile={profile}
          contact={contact}
          data={{
            docType,
            number: existing?.number ?? (mode === "quote" ? "DEV-…" : "FAC-…"),
            title: d.title,
            issue_date: d.issue_date,
            limit_date: d.limit_date || null,
            limit_label: mode === "quote" ? "Valable jusqu'au" : "Échéance",
            items: d.items,
            discount_percent: d.discount_percent,
            deposit_percent: mode === "quote" ? d.deposit_percent : 0,
            notes: d.notes,
            terms: d.terms,
            showSignatureBox: mode === "quote",
            showBankDetails: mode === "invoice",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            {/* Lignes */}
            <section className="card card-pad">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-white">Prestations</h3>
                {activeOffers.length > 0 && (
                  <div className="relative ml-auto">
                    <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300" />
                    <select className="input py-2 pl-9 pr-8 text-sm" value="" onChange={(e) => addOffer(e.target.value)} aria-label="Ajouter une offre du catalogue">
                      <option value="">Ajouter depuis mes offres…</option>
                      {activeOffers.map((o) => (
                        <option key={o.id} value={o.id}>{o.name} — {formatEuro(o.unit_price)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {d.items.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-3">
                    <div className="grid grid-cols-12 gap-2">
                      <input className="input col-span-12 font-medium md:col-span-6" placeholder="Désignation (ex. Création site vitrine)" value={item.description}
                        onChange={(e) => setItem(item.id, { description: e.target.value })} aria-label="Désignation" />
                      <input type="number" min={0} step="0.5" className="input col-span-3 md:col-span-1 px-2 text-right" value={item.quantity}
                        onChange={(e) => setItem(item.id, { quantity: Number(e.target.value) })} aria-label="Quantité" />
                      <select className="input col-span-4 px-2 md:col-span-2" value={item.unit} onChange={(e) => setItem(item.id, { unit: e.target.value })} aria-label="Unité">
                        {Array.from(new Set([...UNITS, item.unit])).map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <div className="relative col-span-5 md:col-span-3">
                        <input type="number" min={0} step="0.01" className="input pr-7 text-right" value={item.unit_price}
                          onChange={(e) => setItem(item.id, { unit_price: Number(e.target.value) })} aria-label="Prix unitaire" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">€</span>
                      </div>
                      <textarea rows={2} className="input col-span-12 text-xs" placeholder="Détails (pages incluses, délais, livrables…)" value={item.details}
                        onChange={(e) => setItem(item.id, { details: e.target.value })} aria-label="Détails" />
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <button className="btn-ghost btn-sm px-2" onClick={() => moveItem(idx, -1)} disabled={idx === 0} aria-label="Monter"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button className="btn-ghost btn-sm px-2" onClick={() => moveItem(idx, 1)} disabled={idx === d.items.length - 1} aria-label="Descendre"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button className="btn-ghost btn-sm px-2 hover:text-rose-300" onClick={() => set("items", d.items.filter((i) => i.id !== item.id))} aria-label="Supprimer la ligne">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="ml-auto text-sm font-medium text-slate-200">{formatEuro(Number(item.quantity) * Number(item.unit_price))}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-secondary mt-3 w-full border-dashed" onClick={() => set("items", [...d.items, emptyLine()])}>
                <Plus className="h-4 w-4" /> Ajouter une ligne
              </button>
            </section>

            <section className="card card-pad grid grid-cols-1 gap-4">
              <Field label="Informations complémentaires (visibles sur le document)">
                <textarea rows={3} className="input" placeholder="Planning, livrables, ce qui est inclus…" value={d.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
              <Field label="Conditions">
                <textarea rows={4} className="input text-xs" value={d.terms} onChange={(e) => set("terms", e.target.value)} />
              </Field>
            </section>
          </div>

          {/* Paramètres du document */}
          <aside className="space-y-6">
            <section className="card card-pad space-y-4">
              <Field label="Client *">
                <select className="input" value={d.contact_id} onChange={(e) => set("contact_id", e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{contactName(c)}{c.company && c.company !== contactName(c) ? ` — ${c.company}` : ""}</option>
                  ))}
                </select>
              </Field>
              {mode === "invoice" && (
                <Field label="Type de facture">
                  <select className="input" value={d.kind} onChange={(e) => set("kind", e.target.value as InvoiceKind)}>
                    {Object.entries(INVOICE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Objet">
                <input className="input" placeholder="Refonte du site internet" value={d.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" className="input px-2" value={d.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
                </Field>
                <Field label={mode === "quote" ? "Valable jusqu'au" : "Échéance"}>
                  <input type="date" className="input px-2" value={d.limit_date} onChange={(e) => set("limit_date", e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Remise (%)">
                  <input type="number" min={0} max={100} step="0.5" className="input" value={d.discount_percent} onChange={(e) => set("discount_percent", Number(e.target.value))} />
                </Field>
                {mode === "quote" && (
                  <Field label="Acompte (%)">
                    <input type="number" min={0} max={100} step="5" className="input" value={d.deposit_percent} onChange={(e) => set("deposit_percent", Number(e.target.value))} />
                  </Field>
                )}
              </div>
            </section>

            <section className="card card-pad space-y-2 text-sm">
              <div className="flex justify-between text-slate-400"><span>Sous-total</span><span>{formatEuro(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-slate-400"><span>Remise</span><span>− {formatEuro(totals.discount)}</span></div>}
              <div className="flex justify-between border-t border-white/[0.06] pt-2 text-base font-semibold text-white"><span>Total net</span><span>{formatEuro(totals.total)}</span></div>
              <p className="text-xs text-slate-500">{profile?.vat_mention || "TVA non applicable, art. 293 B du CGI"}</p>
              {mode === "quote" && totals.deposit > 0 && (
                <div className="flex justify-between text-brand-200"><span>Acompte ({d.deposit_percent} %)</span><span>{formatEuro(totals.deposit)}</span></div>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
