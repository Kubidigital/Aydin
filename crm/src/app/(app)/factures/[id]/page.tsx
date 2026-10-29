import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import type { Contact, Invoice, Offer, Profile, Quote } from "@/lib/types";
import InvoiceDetail from "./InvoiceDetail";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) notFound();

  const [{ data: contacts }, { data: offers }, { data: profile }, { data: quote }] = await Promise.all([
    supabase.from("contacts").select("*").order("company"),
    supabase.from("offers").select("*").order("name"),
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    invoice.quote_id
      ? supabase.from("quotes").select("id, number").eq("id", invoice.quote_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <InvoiceDetail
      invoice={invoice as Invoice}
      contacts={(contacts ?? []) as Contact[]}
      offers={(offers ?? []) as Offer[]}
      profile={profile as Profile | null}
      quote={quote as Pick<Quote, "id" | "number"> | null}
    />
  );
}
