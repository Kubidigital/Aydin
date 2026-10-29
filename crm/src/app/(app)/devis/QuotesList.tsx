"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSignature, Plus, Search } from "lucide-react";
import { QUOTE_STATUSES } from "@/lib/constants";
import { contactName, formatDate, formatEuro, formatEuroShort } from "@/lib/format";
import type { Contact, Quote } from "@/lib/types";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function QuotesList({ quotes, contacts }: { quotes: Quote[]; contacts: Contact[] }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const filtered = quotes.filter((q) => {
    if (status && q.status !== status) return false;
    const s = query.trim().toLowerCase();
    if (!s) return true;
    return [q.number, q.title, contactName(byId.get(q.contact_id ?? "")), byId.get(q.contact_id ?? "")?.company].join(" ").toLowerCase().includes(s);
  });

  const total = (st: string) => quotes.filter((q) => q.status === st).reduce((s, q) => s + Number(q.total), 0);
  const count = (st: string) => quotes.filter((q) => q.status === st).length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Devis"
        subtitle={`${quotes.length} devis · ${formatEuroShort(total("accepte"))} signés · ${formatEuroShort(total("envoye"))} en attente`}
        actions={<Link href="/devis/nouveau" className="btn-primary"><Plus className="h-4 w-4" /> Nouveau devis</Link>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input pl-10" placeholder="Rechercher un numéro, un client, un objet…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={!status} onClick={() => setStatus("")} label="Tous" count={quotes.length} />
          {QUOTE_STATUSES.map((s) => (
            <Chip key={s.value} active={status === s.value} onClick={() => setStatus(status === s.value ? "" : s.value)} label={s.label} count={count(s.value)} />
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FileSignature} title={quotes.length ? "Aucun devis ne correspond" : "Aucun devis"}
            text={quotes.length ? undefined : "Créez votre premier devis personnalisé à partir de votre catalogue d'offres."}
            action={!quotes.length && <Link href="/devis/nouveau" className="btn-primary"><Plus className="h-4 w-4" /> Nouveau devis</Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-white/[0.06]">
                <tr>
                  <th className="table-head">Numéro</th>
                  <th className="table-head">Client</th>
                  <th className="table-head">Objet</th>
                  <th className="table-head">Date</th>
                  <th className="table-head">Statut</th>
                  <th className="table-head text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((q) => (
                  <tr key={q.id} className="cursor-pointer hover:bg-white/[0.02]" onClick={() => router.push(`/devis/${q.id}`)}>
                    <td className="table-cell font-medium text-slate-100">
                      <Link href={`/devis/${q.id}`} onClick={(e) => e.stopPropagation()}>{q.number}</Link>
                    </td>
                    <td className="table-cell text-slate-300">{contactName(byId.get(q.contact_id ?? ""))}</td>
                    <td className="table-cell max-w-[260px] truncate text-slate-400">{q.title || "—"}</td>
                    <td className="table-cell text-slate-400">{formatDate(q.issue_date)}</td>
                    <td className="table-cell"><StatusBadge list={QUOTE_STATUSES} value={q.status} /></td>
                    <td className="table-cell text-right font-medium text-slate-100">{formatEuro(q.total)}</td>
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
