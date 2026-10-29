import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import type { Contact, Quote } from "@/lib/types";
import QuotesList from "./QuotesList";

export const metadata: Metadata = { title: "Devis" };
export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const { supabase } = await getUser();
  const [{ data: quotes }, { data: contacts }] = await Promise.all([
    supabase.from("quotes").select("*").order("issue_date", { ascending: false }).order("number", { ascending: false }),
    supabase.from("contacts").select("id, first_name, last_name, company"),
  ]);
  return <QuotesList quotes={(quotes ?? []) as Quote[]} contacts={(contacts ?? []) as Contact[]} />;
}
