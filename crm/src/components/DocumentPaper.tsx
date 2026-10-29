import { computeTotals, contactName, formatEuro, formatLongDate } from "@/lib/format";
import type { DocumentContact, DocumentProfile, LineItem } from "@/lib/types";

export interface PaperData {
  docType: string; // « Devis », « Facture », « Facture d'acompte »…
  number: string;
  title: string;
  issue_date: string;
  /** Devis : date de validité. Facture : date d'échéance. */
  limit_date: string | null;
  limit_label: string;
  items: LineItem[];
  discount_percent: number;
  deposit_percent?: number;
  notes: string;
  terms: string;
  reference?: string; // ex. « Selon devis DEV-2026-0003 »
  signature?: { name: string | null; date: string | null; image: string | null } | null;
  paid_at?: string | null;
  showSignatureBox?: boolean;
  showBankDetails?: boolean;
}

/** Rendu « papier » A4 d'un devis ou d'une facture (écran + impression PDF). */
export default function DocumentPaper({
  data,
  profile,
  contact,
}: {
  data: PaperData;
  profile: Partial<DocumentProfile> | null;
  contact: Partial<DocumentContact> | null;
}) {
  const { subtotal, discount, total, deposit } = computeTotals(data.items, data.discount_percent, data.deposit_percent ?? 0);
  const p = profile ?? {};
  const owner = [p.first_name, p.last_name].filter(Boolean).join(" ");

  return (
    <article className="print-sheet mx-auto w-full max-w-[820px] rounded-2xl bg-white p-8 text-[13px] leading-relaxed text-slate-800 shadow-2xl sm:p-12">
      {/* En-tête */}
      <header className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          {p.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.logo_url} alt={p.company_name ?? "Logo"} className="mb-3 max-h-16 max-w-[180px] object-contain" />
          ) : (
            <p className="mb-2 font-display text-xl font-semibold text-[#050B1F]">{p.company_name || "Digital Aydin"}</p>
          )}
          {p.logo_url && <p className="font-semibold text-slate-900">{p.company_name}</p>}
          {owner && <p>{owner}{p.legal_status ? ` — ${p.legal_status}` : ""}</p>}
          {p.address && <p>{p.address}</p>}
          {(p.postal_code || p.city) && <p>{[p.postal_code, p.city].filter(Boolean).join(" ")}</p>}
          {p.phone && <p>{p.phone}</p>}
          {p.email && <p>{p.email}</p>}
          {p.website && <p>{p.website.replace(/^https?:\/\//, "")}</p>}
          {p.siret && <p className="text-slate-500">SIRET : {p.siret}</p>}
        </div>

        <div className="sm:text-right">
          <p className="font-display text-3xl font-semibold uppercase tracking-tight text-slate-900">{data.docType}</p>
          <p className="mt-1 font-medium text-[#0B4FD8]">N° {data.number || "—"}</p>
          <p className="mt-3 text-slate-500">Date : <span className="text-slate-800">{formatLongDate(data.issue_date)}</span></p>
          {data.limit_date && (
            <p className="text-slate-500">{data.limit_label} : <span className="text-slate-800">{formatLongDate(data.limit_date)}</span></p>
          )}
          {data.reference && <p className="text-slate-500">{data.reference}</p>}
        </div>
      </header>

      {/* Client */}
      <section className="mt-10 flex justify-end">
        <div className="w-full rounded-xl bg-slate-50 p-5 sm:w-80">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</p>
          {contact ? (
            <>
              {contact.company && <p className="font-semibold text-slate-900">{contact.company}</p>}
              {(contact.first_name || contact.last_name) && (
                <p className={contact.company ? "" : "font-semibold text-slate-900"}>{contactName(contact)}</p>
              )}
              {contact.address && <p>{contact.address}</p>}
              {(contact.postal_code || contact.city) && <p>{[contact.postal_code, contact.city].filter(Boolean).join(" ")}</p>}
              {contact.email && <p>{contact.email}</p>}
              {contact.phone && <p>{contact.phone}</p>}
              {contact.siret && <p className="text-slate-500">SIRET : {contact.siret}</p>}
            </>
          ) : (
            <p className="text-slate-400">Aucun client sélectionné</p>
          )}
        </div>
      </section>

      {data.title && (
        <p className="mt-8 text-base font-semibold text-slate-900">
          <span className="text-slate-400">Objet : </span>{data.title}
        </p>
      )}

      {/* Lignes */}
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-900 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-2 font-semibold">Désignation</th>
            <th className="w-16 py-2 text-right font-semibold">Qté</th>
            <th className="w-20 py-2 pl-2 font-semibold">Unité</th>
            <th className="w-28 py-2 text-right font-semibold">Prix unit.</th>
            <th className="w-28 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-slate-400">Aucune ligne</td></tr>
          )}
          {data.items.map((item) => (
            <tr key={item.id} className="print-avoid-break border-b border-slate-200 align-top">
              <td className="py-3 pr-2">
                <p className="font-medium text-slate-900">{item.description || "—"}</p>
                {item.details && <p className="whitespace-pre-wrap text-[12px] text-slate-500">{item.details}</p>}
              </td>
              <td className="py-3 text-right tabular-nums">{Number(item.quantity).toLocaleString("fr-FR")}</td>
              <td className="py-3 pl-2 text-slate-500">{item.unit}</td>
              <td className="py-3 text-right tabular-nums">{formatEuro(item.unit_price)}</td>
              <td className="py-3 text-right font-medium tabular-nums text-slate-900">{formatEuro(Number(item.quantity) * Number(item.unit_price))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <section className="print-avoid-break mt-6 flex justify-end">
        <dl className="w-full space-y-1.5 sm:w-72">
          {discount > 0 && (
            <>
              <div className="flex justify-between"><dt className="text-slate-500">Sous-total</dt><dd className="tabular-nums">{formatEuro(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Remise ({data.discount_percent} %)</dt><dd className="tabular-nums">− {formatEuro(discount)}</dd></div>
            </>
          )}
          <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-bold text-slate-900">
            <dt>Total net à payer</dt>
            <dd className="tabular-nums">{formatEuro(total)}</dd>
          </div>
          {p.vat_mention && <p className="text-right text-[11px] text-slate-500">{p.vat_mention}</p>}
          {!!data.deposit_percent && data.deposit_percent > 0 && (
            <div className="mt-2 flex justify-between rounded-lg bg-[#0B4FD8]/10 px-3 py-2 text-[#0942b6]">
              <dt>Acompte à la signature ({data.deposit_percent} %)</dt>
              <dd className="font-semibold tabular-nums">{formatEuro(deposit)}</dd>
            </div>
          )}
          {data.paid_at && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-center font-semibold text-emerald-700">
              Payée le {formatLongDate(data.paid_at)}
            </p>
          )}
        </dl>
      </section>

      {data.notes && (
        <section className="print-avoid-break mt-8">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Informations</p>
          <p className="whitespace-pre-wrap">{data.notes}</p>
        </section>
      )}

      {data.showBankDetails && (p.iban || p.bic) && (
        <section className="print-avoid-break mt-6 rounded-xl border border-slate-200 p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Coordonnées bancaires</p>
          {p.iban && <p>IBAN : <span className="font-mono">{p.iban}</span></p>}
          {p.bic && <p>BIC : <span className="font-mono">{p.bic}</span></p>}
        </section>
      )}

      {data.terms && (
        <section className="print-avoid-break mt-6">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Conditions</p>
          <p className="whitespace-pre-wrap text-[12px] text-slate-600">{data.terms}</p>
        </section>
      )}

      {data.showSignatureBox && (
        <section className="print-avoid-break mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div />
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bon pour accord</p>
            {data.signature?.image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.signature.image} alt="Signature du client" className="my-2 h-20 object-contain" />
                <p className="text-[12px]">
                  Signé électroniquement par <strong>{data.signature.name}</strong>
                  {data.signature.date && <> le {new Date(data.signature.date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}</>}
                </p>
              </>
            ) : (
              <p className="mt-1 h-20 text-[12px] text-slate-400">Date, nom et signature précédés de la mention « Bon pour accord »</p>
            )}
          </div>
        </section>
      )}
    </article>
  );
}
