import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import type { Contact, Invoice, Offer, Profile, Quote } from "@/lib/types";
import QuoteDetail from "./QuoteDetail";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!quote) notFound();

  const [{ data: contacts }, { data: offers }, { data: profile }, { data: invoices }] = await Promise.all([
    supabase.from("contacts").select("*").order("company"),
    supabase.from("offers").select("*").order("name"),
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    supabase.from("invoices").select("*").eq("quote_id", id).order("issue_date"),
  ]);

  return (
    <QuoteDetail
      quote={quote as Quote}
      contacts={(contacts ?? []) as Contact[]}
      offers={(offers ?? []) as Offer[]}
      profile={profile as Profile | null}
      invoices={(invoices ?? []) as Invoice[]}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
