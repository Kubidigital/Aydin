import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import type { Offer } from "@/lib/types";
import OffersCatalog from "./OffersCatalog";

export const metadata: Metadata = { title: "Mes offres" };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const { supabase } = await getUser();
  const { data } = await supabase.from("offers").select("*").order("category").order("name");
  return <OffersCatalog offers={(data ?? []) as Offer[]} />;
}
