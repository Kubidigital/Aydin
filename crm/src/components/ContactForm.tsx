"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CONTACT_TYPES, SOURCES, STAGES } from "@/lib/constants";
import type { Contact } from "@/lib/types";
import { ErrorText, Field } from "./ui";

type FormValues = Omit<Contact, "id" | "created_at" | "updated_at">;

const EMPTY: FormValues = {
  first_name: "",
  last_name: "",
  company: "",
  job_title: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  postal_code: "",
  city: "",
  siret: "",
  type: "prospect",
  stage: "nouveau",
  source: "",
  sector: "",
  tags: [],
  estimated_value: 0,
  notes: "",
  next_action: "",
  next_action_date: null,
};

export default function ContactForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact?: Contact;
  onSaved: (c: Contact) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() => {
    if (!contact) return EMPTY;
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = contact;
    return { ...EMPTY, ...rest };
  });
  const [tagsText, setTagsText] = useState((contact?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.first_name && !values.last_name && !values.company) {
      setError("Renseignez au moins un nom ou une entreprise.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      ...values,
      estimated_value: Number(values.estimated_value) || 0,
      next_action_date: values.next_action_date || null,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    };

    const query = contact
      ? supabase.from("contacts").update(payload).eq("id", contact.id).select().single()
      : supabase.from("contacts").insert(payload).select().single();
    const { data, error } = await query;
    if (error || !data) {
      setError(error?.message ?? "Enregistrement impossible.");
      setSaving(false);
      return;
    }

    if (!contact) {
      await supabase.from("activities").insert({ contact_id: data.id, kind: "statut", content: "Contact créé" });
    } else if (contact.stage !== data.stage) {
      await supabase.from("activities").insert({
        contact_id: data.id,
        kind: "statut",
        content: `Étape : ${STAGES.find((s) => s.value === contact.stage)?.label} → ${STAGES.find((s) => s.value === data.stage)?.label}`,
      });
    }
    setSaving(false);
    onSaved(data as Contact);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Prénom"><input className="input" value={values.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
        <Field label="Nom"><input className="input" value={values.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
        <Field label="Entreprise"><input className="input" value={values.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Fonction"><input className="input" value={values.job_title} onChange={(e) => set("job_title", e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className="input" value={values.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Téléphone"><input className="input" value={values.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Site web"><input className="input" placeholder="https://" value={values.website} onChange={(e) => set("website", e.target.value)} /></Field>
        <Field label="SIRET"><input className="input" value={values.siret} onChange={(e) => set("siret", e.target.value)} /></Field>
        <Field label="Adresse" className="sm:col-span-2"><input className="input" value={values.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="Code postal"><input className="input" value={values.postal_code} onChange={(e) => set("postal_code", e.target.value)} /></Field>
        <Field label="Ville"><input className="input" value={values.city} onChange={(e) => set("city", e.target.value)} /></Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 border-t border-white/[0.06] pt-6 sm:grid-cols-2">
        <Field label="Type">
          <select className="input" value={values.type} onChange={(e) => set("type", e.target.value as Contact["type"])}>
            {CONTACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Étape du pipeline">
          <select className="input" value={values.stage} onChange={(e) => set("stage", e.target.value as Contact["stage"])}>
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select className="input" value={values.source} onChange={(e) => set("source", e.target.value)}>
            <option value="">—</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Secteur d'activité"><input className="input" placeholder="Coiffure, BTP, restauration…" value={values.sector} onChange={(e) => set("sector", e.target.value)} /></Field>
        <Field label="Valeur estimée (€)">
          <input type="number" min={0} step="1" className="input" value={values.estimated_value} onChange={(e) => set("estimated_value", Number(e.target.value))} />
        </Field>
        <Field label="Étiquettes (séparées par des virgules)"><input className="input" placeholder="site vitrine, SEO" value={tagsText} onChange={(e) => setTagsText(e.target.value)} /></Field>
        <Field label="Prochaine action"><input className="input" placeholder="Rappeler pour la maquette" value={values.next_action} onChange={(e) => set("next_action", e.target.value)} /></Field>
        <Field label="Date de la prochaine action">
          <input type="date" className="input" value={values.next_action_date ?? ""} onChange={(e) => set("next_action_date", e.target.value || null)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea rows={3} className="input" value={values.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </fieldset>

      <ErrorText error={error} />
      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Annuler</button>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {contact ? "Enregistrer" : "Créer le contact"}
        </button>
      </div>
    </form>
  );
}
