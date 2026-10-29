import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await getUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
  return <SettingsForm userId={user!.id} profile={data as Profile | null} />;
}
