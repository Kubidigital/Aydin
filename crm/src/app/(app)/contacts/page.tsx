import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import ContactsTable from "./ContactsTable";

export const metadata: Metadata = { title: "Contacts" };
export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const { supabase } = await getUser();
  const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
  return <ContactsTable contacts={(data ?? []) as Contact[]} />;
}
