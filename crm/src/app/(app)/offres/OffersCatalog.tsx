"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Pencil, Plus, Repeat, Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UNITS } from "@/lib/constants";
import { formatEuro } from "@/lib/format";
import type { Offer } from "@/lib/types";
import { EmptyState, ErrorText, Field, Modal, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

type OfferDraft = Omit<Offer, "id" | "created_at">;

const EMPTY: OfferDraft = { name: "", description: "", category: "", unit: "forfait", unit_price: 0, is_recurring: false, active: true };

/** Exemples de départ pour une agence web — modifiables après import. */
const STARTER: OfferDraft[] = [
  { name: "Site vitrine", description: "Jusqu'à 5 pages, design sur mesure, responsive, formulaire de contact, optimisation SEO de base.", category: "Création de site", unit: "forfait", unit_price: 0, is_recurring: false, active: true },
  { name: "Site e-commerce", description: "Boutique en ligne, catalogue produits, paiement sécurisé, gestion des commandes.", category: "Création de site", unit: "forfait", unit_price: 0, is_recurring: false, active: true },
  { name: "Page supplémentaire", description: "Conception et intégration d'une page additionnelle.", category: "Création de site", unit: "page", unit_price: 0, is_recurring: false, active: true },
  { name: "Référencement naturel (SEO)", description: "Audit, optimisation technique et contenus, suivi des positions.", category: "Référencement", unit: "mois", unit_price: 0, is_recurring: true, active: true },
  { name: "Maintenance & hébergement", description: "Mises à jour, sauvegardes, sécurité, hébergement et nom de domaine.", category: "Maintenance", unit: "mois", unit_price: 0, is_recurring: true, active: true },
  { name: "Fiche Google Business Profile", description: "Création et optimisation de la fiche d'établissement.", category: "Référencement", unit: "forfait", unit_price: 0, is_recurring: false, active: true },
];

export default function OffersCatalog({ offers }: { offers: Offer[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [draft, setDraft] = useState<OfferDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(o: Offer | "new") {
    setEditing(o);
    setError(null);
    if (o === "new") setDraft(EMPTY);
    else {
      const { id: _id, created_at: _c, ...rest } = o;
      setDraft(rest);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return setError("Le nom est obligatoire.");
    setSaving(true);
    const supabase = createClient();
    const payload = { ...draft, unit_price: Number(draft.unit_price) || 0 };
    const { error } = editing === "new"
      ? await supabase.from("offers").insert(payload)
      : await supabase.from("offers").update(payload).eq("id", (editing as Offer).id);
    setSaving(false);
    if (error) return setError(error.message);
    setEditing(null);
    router.refresh();
  }

  async function remove(o: Offer) {
    if (!confirm(`Supprimer l'offre « ${o.name} » ? Les devis existants ne sont pas modifiés.`)) return;
    await createClient().from("offers").delete().eq("id", o.id);
    router.refresh();
  }

  async function importStarter() {
    setSaving(true);
    await createClient().from("offers").insert(STARTER);
    setSaving(false);
    router.refresh();
  }

  const categories = Array.from(new Set(offers.map((o) => o.category || "Autres")));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Mes offres"
        subtitle="Votre catalogue de prestations, à insérer en un clic dans vos devis."
        actions={<button className="btn-primary" onClick={() => open("new")}><Plus className="h-4 w-4" /> Nouvelle offre</button>}
      />

      {offers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="Votre catalogue est vide"
            text="Ajoutez vos prestations (site vitrine, SEO, maintenance…) avec leurs tarifs, ou partez d'une base prête à compléter."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn-secondary" onClick={importStarter} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Importer des exemples
                </button>
                <button className="btn-primary" onClick={() => open("new")}><Plus className="h-4 w-4" /> Nouvelle offre</button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat}>
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">{cat}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {offers.filter((o) => (o.category || "Autres") === cat).map((o) => (
                  <article key={o.id} className={cn("card card-pad flex flex-col", !o.active && "opacity-50")}>
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold text-white">{o.name}</h4>
                      {o.is_recurring && <span className="badge bg-sky-500/10 text-sky-300 ring-sky-400/20"><Repeat className="h-3 w-3" /> Récurrent</span>}
                    </div>
                    <p className="mt-2 flex-1 text-sm text-slate-400">{o.description || "—"}</p>
                    <div className="mt-4 flex items-end justify-between">
                      <p className="text-xl font-bold text-white">
                        {formatEuro(o.unit_price)} <span className="text-sm font-normal text-slate-500">/ {o.unit}</span>
                      </p>
                      <div className="flex gap-1">
                        <button className="btn-ghost btn-sm px-2" onClick={() => open(o)} aria-label={`Modifier ${o.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                        <button className="btn-ghost btn-sm px-2 hover:text-rose-300" onClick={() => remove(o)} aria-label={`Supprimer ${o.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nouvelle offre" : "Modifier l'offre"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nom *"><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="Description (reprise dans le devis)">
            <textarea rows={3} className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie"><input className="input" placeholder="Création de site" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field>
            <Field label="Unité">
              <select className="input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
                {Array.from(new Set([...UNITS, draft.unit])).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Prix unitaire (€)">
              <input type="number" min={0} step="0.01" className="input" value={draft.unit_price} onChange={(e) => setDraft({ ...draft, unit_price: Number(e.target.value) })} />
            </Field>
            <div className="flex flex-col justify-end gap-2 pb-1 text-sm text-slate-300">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#7c5cff]" checked={draft.is_recurring} onChange={(e) => setDraft({ ...draft, is_recurring: e.target.checked })} /> Récurrent</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#7c5cff]" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
            </div>
          </div>
          <ErrorText error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Annuler</button>
            <button className="btn-primary" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
