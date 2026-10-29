import type { ActivityKind, ContactType, InvoiceKind, InvoiceStatus, QuoteStatus, Stage } from "./types";

export const CONTACT_TYPES: { value: ContactType; label: string; badge: string }[] = [
  { value: "prospect", label: "Prospect", badge: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/20" },
  { value: "client", label: "Client", badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20" },
  { value: "partenaire", label: "Partenaire", badge: "bg-pink-500/15 text-pink-300 ring-pink-400/20" },
];

/** Étapes du pipeline commercial, dans l'ordre. */
export const STAGES: { value: Stage; label: string; dot: string; open: boolean }[] = [
  { value: "nouveau", label: "Nouveau lead", dot: "bg-sky-400", open: true },
  { value: "contacte", label: "RDV découverte", dot: "bg-indigo-400", open: true },
  { value: "qualifie", label: "Qualifié", dot: "bg-violet-400", open: true },
  { value: "proposition", label: "Devis envoyé", dot: "bg-amber-400", open: true },
  { value: "negociation", label: "Négociation", dot: "bg-orange-400", open: true },
  { value: "gagne", label: "Gagné", dot: "bg-emerald-400", open: false },
  { value: "perdu", label: "Perdu", dot: "bg-rose-400", open: false },
];

export const QUOTE_STATUSES: { value: QuoteStatus; label: string; badge: string }[] = [
  { value: "brouillon", label: "Brouillon", badge: "bg-slate-500/15 text-slate-300 ring-slate-400/20" },
  { value: "envoye", label: "Envoyé", badge: "bg-sky-500/15 text-sky-300 ring-sky-400/20" },
  { value: "accepte", label: "Accepté", badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20" },
  { value: "refuse", label: "Refusé", badge: "bg-rose-500/15 text-rose-300 ring-rose-400/20" },
  { value: "expire", label: "Expiré", badge: "bg-amber-500/15 text-amber-300 ring-amber-400/20" },
];

export const INVOICE_STATUSES: { value: InvoiceStatus | "en_retard"; label: string; badge: string }[] = [
  { value: "brouillon", label: "Brouillon", badge: "bg-slate-500/15 text-slate-300 ring-slate-400/20" },
  { value: "envoyee", label: "À encaisser", badge: "bg-sky-500/15 text-sky-300 ring-sky-400/20" },
  { value: "en_retard", label: "En retard", badge: "bg-rose-500/15 text-rose-300 ring-rose-400/20" },
  { value: "payee", label: "Payée", badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20" },
  { value: "annulee", label: "Annulée", badge: "bg-slate-500/15 text-slate-400 ring-slate-400/20" },
];

export const INVOICE_KINDS: Record<InvoiceKind, string> = {
  facture: "Facture",
  acompte: "Facture d'acompte",
  solde: "Facture de solde",
};

export const ACTIVITY_KINDS: { value: ActivityKind; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "appel", label: "Appel" },
  { value: "email", label: "E-mail" },
  { value: "rdv", label: "Rendez-vous" },
  { value: "devis", label: "Devis" },
  { value: "facture", label: "Facture" },
  { value: "fichier", label: "Fichier" },
  { value: "statut", label: "Statut" },
];

export const SOURCES = [
  "Site web (formulaire de devis)",
  "Calendly",
  "Chatbot / WhatsApp",
  "Google / SEO",
  "Avis Google",
  "LinkedIn",
  "Instagram",
  "Bouche-à-oreille",
  "Partenaire / réseau local",
  "Prospection terrain",
  "Autre",
];

/** Secteurs fréquents de la clientèle Digital Aydin (suggestions, saisie libre possible). */
export const SECTORS = [
  "Plâtrerie",
  "Électricité",
  "Rénovation",
  "Menuiserie / ouvertures",
  "Isolation",
  "Coiffure / beauté",
  "Sport / bien-être",
  "Photographie",
  "Commerce / retail",
  "E-commerce",
  "Restauration",
  "Association",
  "PME / startup",
];

export const UNITS = ["forfait", "heure", "jour", "page", "mois", "an", "unité"];

export function labelOf<T extends { value: string; label: string }>(list: T[], value: string) {
  return list.find((i) => i.value === value)?.label ?? value;
}
