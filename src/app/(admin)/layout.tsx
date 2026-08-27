import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/dashboard/app-shell";
import type { Profile, Wallet } from "@/types/database";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: wallet }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single<Pick<Wallet, "balance">>(),
  ]);

  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  return (
    <AppShell
      name={profile.name ?? "Admin"}
      email={profile.email ?? ""}
      balance={Number(wallet?.balance ?? 0)}
      isAdmin
      section="admin"
    >
      {children}
    </AppShell>
  );
}
