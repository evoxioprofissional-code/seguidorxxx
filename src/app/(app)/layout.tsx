import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/dashboard/app-shell";
import type { Profile, Wallet } from "@/types/database";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // perfil + saldo em paralelo (uma validação de sessão só)
  const [{ data: profile }, { data: wallet }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single<Pick<Wallet, "balance">>(),
  ]);

  if (!profile) redirect("/login");

  return (
    <AppShell
      name={profile.name ?? "Usuário"}
      email={profile.email ?? ""}
      balance={Number(wallet?.balance ?? 0)}
      isAdmin={profile.role === "admin"}
      section="user"
    >
      {children}
    </AppShell>
  );
}
