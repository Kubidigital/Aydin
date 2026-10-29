"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, FileText, Landmark, Loader2, Target, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { ErrorText, Field, PageHeader } from "@/components/ui";

type Values = Omit<Profile, "id">;

const DEFAULTS: Values = {
  first_name: "",
  last_name: "",
  job_title: "",
  company_name: "Digital Aydin",
  legal_status: "Entrepreneur individuel (EI)",
  siret: "",
  address: "",
  postal_code: "",
  city: "",
  phone: "",
  email: "",
  website: "",
  logo_url: "",
  iban: "",
  bic: "",
  vat_mention: "TVA non applicable, art. 293 B du CGI",
  quote_validity_days: 30,
  payment_terms_days: 30,
  deposit_percent: 30,
  quote_terms: "",
  invoice_terms: "",
  monthly_revenue_goal: 0,
};

export default function SettingsForm({ userId, profile }: { userId: string; profile: Profile | null }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(() => {
    const { id: _id, ...rest } = profile ?? ({} as Profile);
    return { ...DEFAULTS, ...Object.fromEntries(Object.entries(rest).filter(([, val]) => val !== null)) } as Values;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setSaved(false);
    setV((x) => ({ ...x, [k]: val }));
  };
  const text = (k: keyof Values) => ({
    value: String(v[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
  });
  const num = (k: keyof Values) => ({
    type: "number",
    min: 0,
    value: Number(v[k] ?? 0),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never),
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { created_at: _c, updated_at: _u, ...payload } = v as Values & { created_at?: string; updated_at?: string };
    const { error } = await createClient().from("profiles").upsert({ id: userId, ...payload });
    setSaving(false);
    if (error) return setError(error.message);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle="Ces informations apparaissent sur vos devis, factures et e-mails."
        actions={
          <button className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Enregistré" : "Enregistrer"}
          </button>
        }
      />
      <ErrorText error={error} />

      <Section icon={User} title="Vous" subtitle="Utilisé dans les e-mails et la signature des documents">
        <Field label="Prénom"><input className="input" {...text("first_name")} /></Field>
        <Field label="Nom"><input className="input" {...text("last_name")} /></Field>
        <Field label="Fonction"><input className="input" placeholder="Webmaster" {...text("job_title")} /></Field>
        <Field label="Téléphone"><input className="input" {...text("phone")} /></Field>
        <Field label="E-mail professionnel"><input type="email" className="input" {...text("email")} /></Field>
        <Field label="Site web"><input className="input" placeholder="https://digital-aydin.fr" {...text("website")} /></Field>
      </Section>

      <Section icon={Building2} title="Entreprise" subtitle="Mentions obligatoires sur les devis et factures">
        <Field label="Nom commercial"><input className="input" {...text("company_name")} /></Field>
        <Field label="Statut juridique"><input className="input" {...text("legal_status")} /></Field>
        <Field label="SIRET"><input className="input" {...text("siret")} /></Field>
        <Field label="Mention TVA"><input className="input" {...text("vat_mention")} /></Field>
        <Field label="Adresse" className="sm:col-span-2"><input className="input" {...text("address")} /></Field>
        <Field label="Code postal"><input className="input" {...text("postal_code")} /></Field>
        <Field label="Ville"><input className="input" {...text("city")} /></Field>
        <Field label="URL du logo (facultatif)" className="sm:col-span-2">
          <input className="input" placeholder="https://digital-aydin.fr/wp-content/uploads/…/logo.png" {...text("logo_url")} />
        </Field>
        {v.logo_url && (
          <div className="sm:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.logo_url} alt="Aperçu du logo" className="max-h-16 rounded-lg bg-white p-2" />
          </div>
        )}
      </Section>

      <Section icon={Landmark} title="Coordonnées bancaires" subtitle="Affichées sur les factures à régler">
        <Field label="IBAN"><input className="input font-mono" {...text("iban")} /></Field>
        <Field label="BIC"><input className="input font-mono" {...text("bic")} /></Field>
      </Section>

      <Section icon={FileText} title="Devis & factures" subtitle="Valeurs proposées par défaut à la création">
        <Field label="Validité des devis (jours)"><input className="input" {...num("quote_validity_days")} /></Field>
        <Field label="Délai de paiement (jours)"><input className="input" {...num("payment_terms_days")} /></Field>
        <Field label="Acompte par défaut (%)"><input className="input" max={100} {...num("deposit_percent")} /></Field>
        <div />
        <Field label="Conditions des devis" className="sm:col-span-2"><textarea rows={3} className="input text-xs" {...text("quote_terms")} /></Field>
        <Field label="Conditions des factures" className="sm:col-span-2"><textarea rows={4} className="input text-xs" {...text("invoice_terms")} /></Field>
      </Section>

      <Section icon={Target} title="Objectifs" subtitle="Suivi sur le tableau de bord">
        <Field label="Objectif de CA mensuel (€)"><input className="input" step="100" {...num("monthly_revenue_goal")} /></Field>
      </Section>
    </form>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="card card-pad">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white"><Icon className="h-5 w-5" /></div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
