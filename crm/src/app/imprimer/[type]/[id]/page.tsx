import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { INVOICE_KINDS } from "@/lib/constants";
import type { Contact, Invoice, Profile, Quote } from "@/lib/types";
import DocumentPaper, { type PaperData } from "@/components/DocumentPaper";
import PrintToolbar from "@/components/PrintToolbar";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (type !== "devis" && type !== "facture") notFound();

  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const table = type === "devis" ? "quotes" : "invoices";
  const { data: doc } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (!doc) notFound();

  const [{ data: contact }, { data: profile }] = await Promise.all([
    doc.contact_id ? supabase.from("contacts").select("*").eq("id", doc.contact_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  let data: PaperData;
  if (type === "devis") {
    const q = doc as Quote;
    data = {
      docType: "Devis",
      number: q.number,
      title: q.title,
      issue_date: q.issue_date,
      limit_date: q.valid_until,
      limit_label: "Valable jusqu'au",
      items: q.items,
      discount_percent: q.discount_percent,
      deposit_percent: q.deposit_percent,
      notes: q.notes,
      terms: q.terms,
      showSignatureBox: true,
      signature: q.signed_at ? { name: q.signer_name, date: q.signed_at, image: q.signature } : null,
    };
  } else {
    const i = doc as Invoice;
    data = {
      docType: INVOICE_KINDS[i.kind],
      number: i.number,
      title: i.title,
      issue_date: i.issue_date,
      limit_date: i.due_date,
      limit_label: "Échéance",
      items: i.items,
      discount_percent: i.discount_percent,
      notes: i.notes,
      terms: i.terms,
      paid_at: i.paid_at,
      showBankDetails: i.status !== "payee",
    };
  }

  const c = contact as Contact | null;
  const fileName = `${data.number}${c?.company ? " - " + c.company : ""}`;

  return (
    <main className="min-h-screen pb-12">
      <PrintToolbar fileName={fileName} autoPrint />
      <div className="px-4">
        <DocumentPaper data={data} profile={profile as Profile | null} contact={c} />
      </div>
    </main>
  );
}
