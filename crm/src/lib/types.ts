export type ContactType = "prospect" | "client" | "partenaire";
export type Stage = "nouveau" | "contacte" | "qualifie" | "proposition" | "negociation" | "gagne" | "perdu";
export type QuoteStatus = "brouillon" | "envoye" | "accepte" | "refuse" | "expire";
export type InvoiceStatus = "brouillon" | "envoyee" | "payee" | "annulee";
export type InvoiceKind = "facture" | "acompte" | "solde";
export type ActivityKind = "note" | "appel" | "email" | "rdv" | "devis" | "facture" | "fichier" | "statut";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  company_name: string;
  legal_status: string;
  siret: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  iban: string;
  bic: string;
  vat_mention: string;
  quote_validity_days: number;
  payment_terms_days: number;
  deposit_percent: number;
  quote_terms: string;
  invoice_terms: string;
  monthly_revenue_goal: number;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  job_title: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  postal_code: string;
  city: string;
  siret: string;
  type: ContactType;
  stage: Stage;
  source: string;
  sector: string;
  tags: string[];
  estimated_value: number;
  notes: string;
  next_action: string;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFile {
  id: string;
  contact_id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  unit_price: number;
  is_recurring: boolean;
  active: boolean;
  created_at: string;
}

export interface LineItem {
  id: string;
  description: string;
  details: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export interface Quote {
  id: string;
  contact_id: string | null;
  number: string;
  title: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  items: LineItem[];
  discount_percent: number;
  deposit_percent: number;
  total: number;
  notes: string;
  terms: string;
  public_token: string;
  sent_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signature: string | null;
  refused_at: string | null;
  refusal_reason: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  contact_id: string | null;
  quote_id: string | null;
  number: string;
  kind: InvoiceKind;
  title: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  items: LineItem[];
  discount_percent: number;
  total: number;
  notes: string;
  terms: string;
  created_at: string;
}

export interface Activity {
  id: string;
  contact_id: string | null;
  kind: ActivityKind;
  content: string;
  created_at: string;
}

/** Sous-ensemble d'un contact affiché sur un document (devis/facture). */
export type DocumentContact = Pick<
  Contact,
  "first_name" | "last_name" | "company" | "email" | "phone" | "address" | "postal_code" | "city" | "siret"
>;

/** Sous-ensemble du profil affiché sur un document. */
export type DocumentProfile = Pick<
  Profile,
  | "first_name" | "last_name" | "company_name" | "legal_status" | "siret" | "address" | "postal_code"
  | "city" | "phone" | "email" | "website" | "logo_url" | "vat_mention" | "iban" | "bic"
>;
