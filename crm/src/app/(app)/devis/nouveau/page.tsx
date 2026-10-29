import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import type { Contact, Offer, Profile } from "@/lib/types";
import DocumentEditor from "@/components/DocumentEditor";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nouveau devis" };
export const dynamic = "force-dynamic";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const { contact } = await searchParams;
  const { supabase, user } = await getUser();
  const [{ data: contacts }, { data: offers }, { data: profile }] = await Promise.all([
    supabase.from("contacts").select("*").order("company"),
    supabase.from("offers").select("*").order("name"),
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/devis" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Devis
      </Link>
      <PageHeader title="Nouveau devis" subtitle="Le numéro est attribué automatiquement à l'enregistrement." />
      <DocumentEditor
        mode="quote"
        contacts={(contacts ?? []) as Contact[]}
        offers={(offers ?? []) as Offer[]}
        profile={profile as Profile | null}
        defaultContactId={contact}
      />
    </div>
  );
}
