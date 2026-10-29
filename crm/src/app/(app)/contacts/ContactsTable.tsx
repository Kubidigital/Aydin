"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Search, Users } from "lucide-react";
import { CONTACT_TYPES, STAGES, labelOf } from "@/lib/constants";
import { contactName, formatDate, formatEuroShort, initials } from "@/lib/format";
import type { Contact } from "@/lib/types";
import ContactForm from "@/components/ContactForm";
import { Avatar, EmptyState, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";

type SortKey = "name" | "company" | "estimated_value" | "created_at";

export default function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "created_at", dir: -1 });
  const [creating, setCreating] = useState(params.get("nouveau") === "1");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = contacts.filter((c) => {
      if (type && c.type !== type) return false;
      if (stage && c.stage !== stage) return false;
      if (!q) return true;
      return [c.first_name, c.last_name, c.company, c.email, c.phone, c.city, c.sector, ...(c.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const value = (c: Contact) =>
      sort.key === "name" ? contactName(c).toLowerCase()
        : sort.key === "company" ? (c.company || "").toLowerCase()
        : sort.key === "estimated_value" ? Number(c.estimated_value)
        : c.created_at;
    return [...rows].sort((a, b) => (value(a) < value(b) ? -sort.dir : value(a) > value(b) ? sort.dir : 0));
  }, [contacts, query, type, stage, sort]);

  const countByType = (t: string) => contacts.filter((c) => c.type === t).length;

  function SortHeader({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) {
    const active = sort.key === k;
    return (
      <th className={cn("table-head", className)}>
        <button
          className={cn("inline-flex items-center gap-1 uppercase", active && "text-slate-200")}
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}
        >
          {children}
          {active && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        </button>
      </th>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} contact(s) · ${countByType("client")} client(s)`}
        actions={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nouveau contact
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input pl-10" placeholder="Rechercher un nom, une entreprise, une ville, une étiquette…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input lg:w-48" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filtrer par étape">
          <option value="">Toutes les étapes</option>
          {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={type === ""} onClick={() => setType("")} label="Tous" count={contacts.length} />
        {CONTACT_TYPES.map((t) => (
          <FilterChip key={t.value} active={type === t.value} onClick={() => setType(type === t.value ? "" : t.value)} label={t.label} count={countByType(t.value)} />
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={contacts.length ? "Aucun contact ne correspond" : "Aucun contact"}
            text={contacts.length ? "Modifiez votre recherche ou vos filtres." : "Ajoutez votre premier prospect ou client pour commencer."}
            action={!contacts.length && <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouveau contact</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-white/[0.06]">
                <tr>
                  <SortHeader k="name">Contact</SortHeader>
                  <SortHeader k="company">Entreprise</SortHeader>
                  <th className="table-head">Type</th>
                  <th className="table-head">Étape</th>
                  <SortHeader k="estimated_value" className="text-right">Valeur</SortHeader>
                  <SortHeader k="created_at">Ajouté le</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((c) => (
                  <tr key={c.id} className="cursor-pointer transition hover:bg-white/[0.02]" onClick={() => router.push(`/contacts/${c.id}`)}>
                    <td className="table-cell">
                      <Link href={`/contacts/${c.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <Avatar text={initials(c)} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">{contactName(c)}</p>
                          <p className="truncate text-xs text-slate-500">{c.email || c.phone || "—"}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="table-cell text-slate-300">{c.company || "—"}</td>
                    <td className="table-cell"><StatusBadge list={CONTACT_TYPES} value={c.type} /></td>
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-2 text-slate-300">
                        <span className={cn("h-2 w-2 rounded-full", STAGES.find((s) => s.value === c.stage)?.dot)} />
                        {labelOf(STAGES, c.stage)}
                      </span>
                    </td>
                    <td className="table-cell text-right text-slate-300">{c.estimated_value ? formatEuroShort(c.estimated_value) : "—"}</td>
                    <td className="table-cell text-slate-400">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouveau contact" wide>
        <ContactForm
          onCancel={() => setCreating(false)}
          onSaved={(c) => {
            setCreating(false);
            router.push(`/contacts/${c.id}`);
          }}
        />
      </Modal>
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition",
        active ? "bg-brand-500/20 text-brand-200 ring-brand-400/30" : "bg-white/[0.02] text-slate-400 ring-white/10 hover:text-slate-200",
      )}
    >
      {label} <span className="ml-1 text-slate-500">{count}</span>
    </button>
  );
}
