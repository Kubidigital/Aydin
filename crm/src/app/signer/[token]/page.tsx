import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatEuro } from "@/lib/format";
import type { DocumentContact, DocumentProfile, Quote } from "@/lib/types";
import DocumentPaper from "@/components/DocumentPaper";
import PrintToolbar from "@/components/PrintToolbar";
import SignaturePanel from "./SignaturePanel";

export const metadata: Metadata = { title: "Votre devis", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_quote", { p_token: token });
  if (!data) notFound();

  const { quote, contact, profile } = data as {
    quote: Quote;
    contact: DocumentContact | null;
    profile: DocumentProfile | null;
  };

  return (
    <main className="min-h-screen pb-16">
      <PrintToolbar fileName={`Devis ${quote.number}${profile?.company_name ? " - " + profile.company_name : ""}`} />
      <div className="mx-auto max-w-[820px] px-4">
        <div className="no-print mb-6">
          <p className="text-sm text-slate-400">{profile?.company_name} vous a transmis un devis</p>
          <h1 className="text-2xl font-bold text-white">Devis {quote.number} · {formatEuro(quote.total)}</h1>
          {quote.status === "accepte" && (
            <Banner icon={CheckCircle2} className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
              Devis signé le {formatDate(quote.signed_at)} par {quote.signer_name}. Merci pour votre confiance !
            </Banner>
          )}
          {quote.status === "refuse" && (
            <Banner icon={XCircle} className="border-rose-500/30 bg-rose-500/10 text-rose-200">Ce devis a été décliné.</Banner>
          )}
          {quote.status === "expire" && (
            <Banner icon={Clock} className="border-amber-500/30 bg-amber-500/10 text-amber-200">
              Ce devis a expiré le {formatDate(quote.valid_until)}. Contactez {profile?.company_name ?? "nous"} pour en obtenir un nouveau.
            </Banner>
          )}
        </div>

        <DocumentPaper
          profile={profile}
          contact={contact}
          data={{
            docType: "Devis",
            number: quote.number,
            title: quote.title,
            issue_date: quote.issue_date,
            limit_date: quote.valid_until,
            limit_label: "Valable jusqu'au",
            items: quote.items,
            discount_percent: quote.discount_percent,
            deposit_percent: quote.deposit_percent,
            notes: quote.notes,
            terms: quote.terms,
            showSignatureBox: true,
            signature: quote.signed_at ? { name: quote.signer_name, date: quote.signed_at, image: quote.signature } : null,
          }}
        />

        {quote.status === "envoye" && (
          <div className="no-print mt-8">
            <SignaturePanel token={token} total={formatEuro(quote.total)} />
          </div>
        )}
      </div>
    </main>
  );
}

function Banner({ icon: Icon, className, children }: { icon: React.ComponentType<{ className?: string }>; className: string; children: React.ReactNode }) {
  return (
    <div className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${className}`}>
      <Icon className="h-5 w-5 shrink-0" /> {children}
    </div>
  );
}
