"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Euro, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STAGES, labelOf } from "@/lib/constants";
import { contactName, formatDate, formatEuroShort, initials, today } from "@/lib/format";
import type { Contact, Stage } from "@/lib/types";
import { Avatar, ErrorText, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function PipelineBoard({ contacts: initial }: { contacts: Contact[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setContacts(initial), [initial]);

  async function move(id: string, stage: Stage) {
    const c = contacts.find((x) => x.id === id);
    if (!c || c.stage === stage) return;
    const previous = contacts;
    // Gagné => le contact devient client
    const patch: Partial<Contact> = { stage, ...(stage === "gagne" && c.type === "prospect" ? { type: "client" as const } : {}) };
    setContacts((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));

    const supabase = createClient();
    const { error } = await supabase.from("contacts").update(patch).eq("id", id);
    if (error) {
      setContacts(previous);
      setError(error.message);
      return;
    }
    await supabase.from("activities").insert({
      contact_id: id,
      kind: "statut",
      content: `Étape : ${labelOf(STAGES, c.stage)} → ${labelOf(STAGES, stage)}`,
    });
    router.refresh();
  }

  const open = contacts.filter((c) => STAGES.find((s) => s.value === c.stage)?.open);
  const openValue = open.reduce((s, c) => s + Number(c.estimated_value || 0), 0);
  const won = contacts.filter((c) => c.stage === "gagne").length;
  const lost = contacts.filter((c) => c.stage === "perdu").length;
  const winRate = won + lost ? Math.round((won / (won + lost)) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Pipeline de vente"
        subtitle="Glissez-déposez une carte pour faire avancer une opportunité."
        actions={
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="badge bg-white/[0.04] px-3 py-1.5 text-slate-300 ring-white/10"><Users className="h-3.5 w-3.5" /> {open.length} en cours</span>
            <span className="badge bg-emerald-500/10 px-3 py-1.5 text-emerald-300 ring-emerald-400/20"><Euro className="h-3.5 w-3.5" /> {formatEuroShort(openValue)}</span>
            <span className="badge bg-brand-500/10 px-3 py-1.5 text-brand-200 ring-brand-400/20">{winRate} % gagnées</span>
          </div>
        }
      />
      <ErrorText error={error} />

      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max gap-4">
          {STAGES.map((stage) => {
            const items = contacts.filter((c) => c.stage === stage.value);
            const value = items.reduce((s, c) => s + Number(c.estimated_value || 0), 0);
            return (
              <div
                key={stage.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage.value);
                }}
                onDragLeave={() => setOverStage((s) => (s === stage.value ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverStage(null);
                  const id = e.dataTransfer.getData("text/plain") || dragId;
                  if (id) move(id, stage.value);
                }}
                className={cn(
                  "flex w-72 flex-col rounded-2xl border bg-ink-900/60 transition",
                  overStage === stage.value ? "border-brand-400/50 bg-brand-500/[0.06]" : "border-white/[0.06]",
                )}
              >
                <div className="flex items-center gap-2 px-4 pb-2 pt-4">
                  <span className={cn("h-2 w-2 rounded-full", stage.dot)} />
                  <h3 className="text-sm font-semibold text-white">{stage.label}</h3>
                  <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-slate-400">{items.length}</span>
                </div>
                <p className="px-4 pb-3 text-xs text-slate-500">{formatEuroShort(value)}</p>
                <div className="flex min-h-[420px] flex-1 flex-col gap-2 px-2 pb-2">
                  {items.length === 0 && <p className="py-8 text-center text-xs text-slate-600">Aucun contact</p>}
                  {items.map((c) => {
                    const late = c.next_action_date && c.next_action_date < today();
                    return (
                      <Link
                        key={c.id}
                        href={`/contacts/${c.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", c.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(c.id);
                        }}
                        onDragEnd={() => setDragId(null)}
                        className={cn(
                          "group block cursor-grab rounded-xl border border-white/[0.06] bg-ink-800 p-3 transition hover:border-white/15 active:cursor-grabbing",
                          dragId === c.id && "opacity-40",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar text={initials(c)} className="h-8 w-8 text-[11px]" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-100">{contactName(c)}</p>
                            {c.company && c.company !== contactName(c) && <p className="truncate text-xs text-slate-500">{c.company}</p>}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-300">{c.estimated_value ? formatEuroShort(c.estimated_value) : "—"}</span>
                          {c.next_action_date && (
                            <span className={cn("inline-flex items-center gap-1", late ? "text-rose-300" : "text-slate-500")} title={c.next_action}>
                              <CalendarClock className="h-3 w-3" /> {formatDate(c.next_action_date, { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
