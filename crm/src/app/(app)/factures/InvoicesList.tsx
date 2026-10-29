"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Receipt, Search } from "lucide-react";
import { INVOICE_KINDS, INVOICE_STATUSES } from "@/lib/constants";
import { contactName, formatDate, formatEuro, formatEuroShort, invoiceDisplayStatus } from "@/lib/format";
import type { Contact, Invoice } from "@/lib/types";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function InvoicesList({ invoices, contacts }: { invoices: Invoice[]; contacts: Contact[] }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const rows = invoices.map((i) => ({ ...i, display: invoiceDisplayStatus(i) }));
  const filtered = rows.filter((i) => {
    if (status && i.display !== status) return false;
    const s = query.trim().toLowerCase();
    if (!s) return true;
    return [i.number, i.title, contactName(byId.get(i.contact_id ?? "")), byId.get(i.contact_id ?? "")?.company].join(" ").toLowerCase().includes(s);
  });

  const sumOf = (st: string) => rows.filter((i) => i.display === st).reduce((s, i) => s + Number(i.total), 0);
  const count = (st: string) => rows.filter((i) => i.display === st).length;
  const year = String(new Date().getFullYear());
  const paidYear = rows.filter((i) => i.status === "payee" && (i.paid_at ?? i.issue_date).startsWith(year)).reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Factures"
        subtitle={`${formatEuroShort(paidYear)} encaissés en ${year} · ${formatEuroShort(sumOf("envoyee") + sumOf("en_retard"))} à encaisser`}
        actions={<Link href="/factures/nouveau" className="btn-primary"><Plus className="h-4 w-4" /> Nouvelle facture</Link>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input pl-10" placeholder="Rechercher un numéro, un client, un objet…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={!status} onClick={() => setStatus("")} label="Toutes" count={rows.length} />
          {INVOICE_STATUSES.map((s) => (
            <Chip key={s.value} active={status === s.value} onClick={() => setStatus(status === s.value ? "" : s.value)} label={s.label} count={count(s.value)} />
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Receipt} title={invoices.length ? "Aucune facture ne correspond" : "Aucune facture"}
            text={invoices.length ? undefined : "Transformez un devis accepté en facture, ou créez-en une directement."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-white/[0.06]">
                <tr>
                  <th className="table-head">Numéro</th>
                  <th className="table-head">Client</th>
                  <th className="table-head">Type</th>
                  <th className="table-head">Date</th>
                  <th className="table-head">Échéance</th>
                  <th className="table-head">Statut</th>
                  <th className="table-head text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((i) => (
                  <tr key={i.id} className="cursor-pointer hover:bg-white/[0.02]" onClick={() => router.push(`/factures/${i.id}`)}>
                    <td className="table-cell font-medium text-slate-100">
                      <Link href={`/factures/${i.id}`} onClick={(e) => e.stopPropagation()}>{i.number}</Link>
                    </td>
                    <td className="table-cell text-slate-300">{contactName(byId.get(i.contact_id ?? ""))}</td>
                    <td className="table-cell text-slate-400">{INVOICE_KINDS[i.kind]}</td>
                    <td className="table-cell text-slate-400">{formatDate(i.issue_date)}</td>
                    <td className={cn("table-cell", i.display === "en_retard" ? "text-rose-300" : "text-slate-400")}>{formatDate(i.due_date)}</td>
                    <td className="table-cell"><StatusBadge list={INVOICE_STATUSES} value={i.display} /></td>
                    <td className="table-cell text-right font-medium text-slate-100">{formatEuro(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick}
      className={cn("rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition",
        active ? "bg-brand-500/20 text-brand-200 ring-brand-400/30" : "bg-white/[0.02] text-slate-400 ring-white/10 hover:text-slate-200")}>
      {label} <span className="ml-1 text-slate-500">{count}</span>
    </button>
  );
}
