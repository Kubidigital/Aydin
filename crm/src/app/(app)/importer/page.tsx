import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { contactName } from "@/lib/format";
import Importer from "./Importer";

export const metadata: Metadata = { title: "Importer" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const { supabase } = await getUser();
  const [{ data: contacts }, { data: invoices }] = await Promise.all([
    supabase.from("contacts").select("email, company, first_name, last_name"),
    supabase.from("invoices").select("number"),
  ]);
  return (
    <Importer
      existingEmails={(contacts ?? []).map((c) => c.email).filter(Boolean)}
      existingNames={(contacts ?? []).map((c) => c.company || contactName(c))}
      existingNumbers={(invoices ?? []).map((i) => i.number)}
    />
  );
}
