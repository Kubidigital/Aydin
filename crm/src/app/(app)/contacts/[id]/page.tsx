import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import type { Activity, Contact, ContactFile, Invoice, Quote } from "@/lib/types";
import ContactDetail from "./ContactDetail";

export const dynamic = "force-dynamic";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();

  const { data: contact } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
  if (!contact) notFound();

  const [{ data: files }, { data: quotes }, { data: invoices }, { data: activities }] = await Promise.all([
    supabase.from("contact_files").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").eq("contact_id", id).order("issue_date", { ascending: false }),
    supabase.from("invoices").select("*").eq("contact_id", id).order("issue_date", { ascending: false }),
    supabase.from("activities").select("*").eq("contact_id", id).order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <ContactDetail
      contact={contact as Contact}
      files={(files ?? []) as ContactFile[]}
      quotes={(quotes ?? []) as Quote[]}
      invoices={(invoices ?? []) as Invoice[]}
      activities={(activities ?? []) as Activity[]}
    />
  );
}
