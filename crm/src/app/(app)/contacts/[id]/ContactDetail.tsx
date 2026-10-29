"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_KINDS, CONTACT_TYPES, INVOICE_STATUSES, QUOTE_STATUSES, STAGES, labelOf } from "@/lib/constants";
import { contactName, formatDate, formatEuro, formatEuroShort, formatSize, initials, invoiceDisplayStatus } from "@/lib/format";
import type { Activity, ActivityKind, Contact, ContactFile, Invoice, Quote } from "@/lib/types";
import ContactForm from "@/components/ContactForm";
import { Avatar, ErrorText, Modal, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function ContactDetail({
  contact,
  files,
  quotes,
  invoices,
  activities,
}: {
  contact: Contact;
  files: ContactFile[];
  quotes: Quote[];
  invoices: Invoice[];
  activities: Activity[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStage(stage: Contact["stage"]) {
    if (stage === contact.stage) return;
    const { error } = await supabase.from("contacts").update({ stage }).eq("id", contact.id);
    if (error) return setError(error.message);
    await supabase.from("activities").insert({
      contact_id: contact.id,
      kind: "statut",
      content: `Étape : ${labelOf(STAGES, contact.stage)} → ${labelOf(STAGES, stage)}`,
    });
    router.refresh();
  }

  async function deleteContact() {
    if (!confirm(`Supprimer définitivement ${contactName(contact)} ainsi que ses fichiers et son historique ? Les devis et factures sont conservés.`)) return;
    if (files.length) await supabase.storage.from("contact-files").remove(files.map((f) => f.path));
    const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
    if (error) return setError(error.message);
    router.push("/contacts");
    router.refresh();
  }

  const signedTotal = quotes.filter((q) => q.status === "accepte").reduce((s, q) => s + Number(q.total), 0);
  const paidTotal = invoices.filter((i) => i.status === "payee").reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/contacts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Contacts
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar text={initials(contact)} className="h-14 w-14 text-base" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl font-semibold tracking-tight text-white">{contactName(contact)}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            {contact.company && contact.company !== contactName(contact) && <span>{contact.company}</span>}
            {contact.job_title && <span>· {contact.job_title}</span>}
            <StatusBadge list={CONTACT_TYPES} value={contact.type} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/devis/nouveau?contact=${contact.id}`} className="btn-primary"><Plus className="h-4 w-4" /> Nouveau devis</Link>
          <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Modifier</button>
          <button className="btn-danger" onClick={deleteContact} aria-label="Supprimer le contact"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <ErrorText error={error} />

      {/* Étapes du pipeline */}
      <div className="card mb-6 overflow-x-auto p-2">
        <div className="flex min-w-max gap-1">
          {STAGES.map((s) => (
            <button
              key={s.value}
              onClick={() => changeStage(s.value)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition",
                contact.stage === s.value ? "bg-white/[0.08] font-medium text-white" : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", s.dot)} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne gauche : coordonnées */}
        <div className="space-y-6">
          <section className="card card-pad space-y-3 text-sm">
            <h3 className="mb-2 font-semibold text-white">Coordonnées</h3>
            <InfoLine icon={Mail} value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
            <InfoLine icon={Phone} value={contact.phone} href={contact.phone ? `tel:${contact.phone.replace(/\s/g, "")}` : undefined} />
            <InfoLine icon={Globe} value={contact.website} href={contact.website || undefined} external />
            <InfoLine icon={MapPin} value={[contact.address, [contact.postal_code, contact.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />
            <InfoLine icon={Building2} value={contact.siret ? `SIRET ${contact.siret}` : ""} />
          </section>

          <section className="card card-pad space-y-3 text-sm">
            <h3 className="mb-2 font-semibold text-white">Suivi commercial</h3>
            <Meta label="Valeur estimée" value={contact.estimated_value ? formatEuroShort(contact.estimated_value) : "—"} />
            <Meta label="CA signé" value={formatEuroShort(signedTotal)} />
            <Meta label="CA encaissé" value={formatEuroShort(paidTotal)} />
            <Meta label="Source" value={contact.source || "—"} />
            <Meta label="Secteur" value={contact.sector || "—"} />
            <Meta label="Prochaine action" value={contact.next_action ? `${contact.next_action}${contact.next_action_date ? " · " + formatDate(contact.next_action_date) : ""}` : "—"} />
            <Meta label="Ajouté le" value={formatDate(contact.created_at)} />
            {contact.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {contact.tags.map((t) => <span key={t} className="badge bg-white/[0.04] text-slate-300 ring-white/10">{t}</span>)}
              </div>
            )}
            {contact.notes && <p className="whitespace-pre-wrap border-t border-white/[0.06] pt-3 text-slate-300">{contact.notes}</p>}
          </section>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6 lg:col-span-2">
          <FilesSection contactId={contact.id} files={files} onChange={() => router.refresh()} />

          <section className="card card-pad">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">Devis & factures</h3>
              <Link href={`/devis/nouveau?contact=${contact.id}`} className="btn-ghost btn-sm"><Plus className="h-3.5 w-3.5" /> Devis</Link>
            </div>
            {quotes.length + invoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Aucun document commercial pour ce contact.</p>
            ) : (
              <div className="-mx-2 divide-y divide-white/[0.04]">
                {quotes.map((q) => (
                  <Link key={q.id} href={`/devis/${q.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/[0.03]">
                    <FileText className="h-4 w-4 shrink-0 text-brand-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-100">{q.number} {q.title && <span className="text-slate-500">· {q.title}</span>}</p>
                      <p className="text-xs text-slate-500">Devis du {formatDate(q.issue_date)}</p>
                    </div>
                    <StatusBadge list={QUOTE_STATUSES} value={q.status} />
                    <span className="w-24 text-right text-sm font-medium text-slate-200">{formatEuro(q.total)}</span>
                  </Link>
                ))}
                {invoices.map((i) => (
                  <Link key={i.id} href={`/factures/${i.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/[0.03]">
                    <FileText className="h-4 w-4 shrink-0 text-emerald-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-100">{i.number} {i.title && <span className="text-slate-500">· {i.title}</span>}</p>
                      <p className="text-xs text-slate-500">Facture du {formatDate(i.issue_date)}</p>
                    </div>
                    <StatusBadge list={INVOICE_STATUSES} value={invoiceDisplayStatus(i)} />
                    <span className="w-24 text-right text-sm font-medium text-slate-200">{formatEuro(i.total)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <ActivitySection contactId={contact.id} activities={activities} onChange={() => router.refresh()} />
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Modifier le contact" wide>
        <ContactForm
          contact={contact}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

function InfoLine({ icon: Icon, value, href, external }: { icon: React.ComponentType<{ className?: string }>; value: string; href?: string; external?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      {value ? (
        href ? (
          <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="break-all text-slate-200 hover:text-brand-200">{value}</a>
        ) : (
          <span className="text-slate-200">{value}</span>
        )
      ) : (
        <span className="text-slate-600">—</span>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

function FilesSection({ contactId, files, onChange }: { contactId: string; files: ContactFile[]; onChange: () => void }) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`« ${file.name} » dépasse 50 Mo.`);
        continue;
      }
      const safeName = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_");
      const path = `${user.id}/${contactId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("contact-files").upload(path, file, { contentType: file.type || undefined });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      await supabase.from("contact_files").insert({ contact_id: contactId, name: file.name, path, size: file.size, mime_type: file.type });
      await supabase.from("activities").insert({ contact_id: contactId, kind: "fichier", content: `Fichier ajouté : ${file.name}` });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    onChange();
  }

  async function download(f: ContactFile) {
    const { data, error } = await supabase.storage.from("contact-files").createSignedUrl(f.path, 60, { download: f.name });
    if (error || !data) return setError(error?.message ?? "Téléchargement impossible.");
    window.open(data.signedUrl, "_blank");
  }

  async function remove(f: ContactFile) {
    if (!confirm(`Supprimer « ${f.name} » ?`)) return;
    await supabase.storage.from("contact-files").remove([f.path]);
    await supabase.from("contact_files").delete().eq("id", f.id);
    onChange();
  }

  return (
    <section className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">Documents du client</h3>
        <button className="btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Ajouter
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-sm transition",
          dragging ? "border-brand-400 bg-brand-500/10 text-brand-200" : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300",
        )}
      >
        <Upload className="mb-2 h-5 w-5" />
        Glissez vos fichiers ici (contrats, cahier des charges, logos, maquettes…) · 50 Mo max
      </div>
      <ErrorText error={error} />

      {files.length > 0 && (
        <ul className="-mx-2 divide-y divide-white/[0.04]">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-2 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-100">{f.name}</p>
                <p className="text-xs text-slate-500">{formatSize(f.size)} · {formatDate(f.created_at)}</p>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => download(f)} aria-label={`Télécharger ${f.name}`}><Download className="h-3.5 w-3.5" /></button>
              <button className="btn-ghost btn-sm hover:text-rose-300" onClick={() => remove(f)} aria-label={`Supprimer ${f.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivitySection({ contactId, activities, onChange }: { contactId: string; activities: Activity[]; onChange: () => void }) {
  const [kind, setKind] = useState<ActivityKind>("note");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    await createClient().from("activities").insert({ contact_id: contactId, kind, content: content.trim() });
    setContent("");
    setSaving(false);
    onChange();
  }

  return (
    <section className="card card-pad">
      <h3 className="mb-3 font-semibold text-white">Historique</h3>
      <form onSubmit={add} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <select className="input sm:w-40" value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} aria-label="Type d'activité">
          {ACTIVITY_KINDS.filter((k) => ["note", "appel", "email", "rdv"].includes(k.value)).map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <input className="input flex-1" placeholder="Compte rendu d'appel, note, rendez-vous…" value={content} onChange={(e) => setContent(e.target.value)} />
        <button className="btn-secondary" disabled={saving || !content.trim()}><Send className="h-4 w-4" /> Ajouter</button>
      </form>
      {activities.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">Aucune activité.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-white/[0.06] pl-5">
          {activities.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-ink-850 bg-brand-400" />
              <p className="whitespace-pre-wrap text-sm text-slate-200">{a.content}</p>
              <p className="text-xs text-slate-500">
                {labelOf(ACTIVITY_KINDS, a.kind)} · {formatDate(a.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
