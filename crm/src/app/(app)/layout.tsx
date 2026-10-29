import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, company_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell
      userName={profile?.first_name || user.email?.split("@")[0] || ""}
      companyName={profile?.company_name || "Digital Aydin"}
    >
      {children}
    </AppShell>
  );
}
