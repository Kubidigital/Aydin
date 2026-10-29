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

/**
 * Catalogue de départ reprenant les pôles de services de Digital Aydin.
 * Pas de grille tarifaire publique (devis sur mesure) : les prix sont à 0 € et à compléter.
 */
const o = (category: string, name: string, description: string, unit = "forfait", is_recurring = false): OfferDraft =>
  ({ name, description, category, unit, unit_price: 0, is_recurring, active: true });

const STARTER: OfferDraft[] = [
  o("Site Web & E-commerce", "Site vitrine sur mesure", "Conception 100 % sur mesure, responsive (ordinateur, tablette, mobile), formulaire de contact, sécurisation SSL et optimisation SEO de base."),
  o("Site Web & E-commerce", "Landing page", "Page unique orientée conversion : accroche, preuves sociales, appel à l'action et formulaire."),
  o("Site Web & E-commerce", "Boutique e-commerce WooCommerce", "Catalogue produits, paiement sécurisé, gestion des commandes et des stocks, pages légales."),
  o("Site Web & E-commerce", "Page supplémentaire", "Conception et intégration d'une page additionnelle.", "page"),
  o("Site Web & E-commerce", "Blog", "Mise en place d'un blog avec catégories et mise en forme optimisée pour le référencement."),
  o("SEO & Visibilité", "Audit SEO", "Analyse technique (vitesse, mobile, balises), mots-clés et concurrence, avec plan d'actions priorisé."),
  o("SEO & Visibilité", "Référencement naturel (SEO)", "Optimisation technique et contenus, mots-clés locaux, netlinking, suivi des positions.", "mois", true),
  o("SEO & Visibilité", "Article de blog SEO", "Rédaction et optimisation d'un article ciblé sur une requête stratégique.", "unité"),
  o("SEO & Visibilité", "Fiche Google Business Profile", "Création et optimisation de la fiche d'établissement pour le référencement local."),
  o("SEO & Visibilité", "Campagnes Google Ads (SEA)", "Création et pilotage des campagnes, suivi des conversions et rapport mensuel.", "mois", true),
  o("Réseaux sociaux & publicité", "Gestion des réseaux sociaux", "Animation de vos comptes (Facebook, Instagram, LinkedIn) : calendrier éditorial, visuels et textes.", "mois", true),
  o("Réseaux sociaux & publicité", "Campagne Social Ads", "Publicités ciblées sur les réseaux sociaux avec analyse des performances et du ROI."),
  o("Branding & Identité", "Logo", "Création de logo avec déclinaisons couleur, monochrome et formats web/impression."),
  o("Branding & Identité", "Charte graphique", "Couleurs, typographies, règles d'usage et supports visuels pour une image de marque cohérente."),
  o("Supports de communication", "Cartes de visite", "Conception graphique, fichiers prêts pour l'impression."),
  o("Supports de communication", "Flyer / brochure", "Conception graphique d'un flyer ou d'une brochure, fichiers prêts pour l'impression."),
  o("Logiciel & CRM", "Application web / outil métier", "Développement sur mesure : CRM, automatisations, outils internes.", "jour"),
  o("Accompagnement & suivi", "Maintenance & sécurité", "Mises à jour, sauvegardes, surveillance, petites modifications.", "mois", true),
  o("Accompagnement & suivi", "Formation à la gestion du site", "Prise en main de votre site pour être autonome sur vos contenus.", "heure"),
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
            text="Ajoutez vos prestations avec leurs tarifs, ou importez vos services Digital Aydin (site, SEO, branding, CRM…) puis renseignez vos prix."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn-secondary" onClick={importStarter} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Importer mes services
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
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#0B4FD8]" checked={draft.is_recurring} onChange={(e) => setDraft({ ...draft, is_recurring: e.target.checked })} /> Récurrent</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#0B4FD8]" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
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
