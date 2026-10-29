import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import PipelineBoard from "./PipelineBoard";

export const metadata: Metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const { supabase } = await getUser();
  const { data } = await supabase.from("contacts").select("*").order("updated_at", { ascending: false });
  return <PipelineBoard contacts={(data ?? []) as Contact[]} />;
}
