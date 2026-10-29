import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import type { Contact, Invoice } from "@/lib/types";
import InvoicesList from "./InvoicesList";

export const metadata: Metadata = { title: "Factures" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const { supabase } = await getUser();
  const [{ data: invoices }, { data: contacts }] = await Promise.all([
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }).order("number", { ascending: false }),
    supabase.from("contacts").select("id, first_name, last_name, company"),
  ]);
  return <InvoicesList invoices={(invoices ?? []) as Invoice[]} contacts={(contacts ?? []) as Contact[]} />;
}
