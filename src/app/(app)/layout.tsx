import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/dashboard/app-shell";
import { AnnouncementPopup, type Announcement } from "@/components/announcement-popup";
import type { Profile, Wallet } from "@/types/database";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // perfil + saldo + aviso em paralelo (uma validação de sessão só)
  const [{ data: profile }, { data: wallet }, { data: ann }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single<Pick<Wallet, "balance">>(),
    supabase.from("app_settings").select("value").eq("key", "announcement").single(),
  ]);

  if (!profile) redirect("/login");

  const announcement = (ann?.value ?? null) as Announcement | null;

  return (
    <>
      <AppShell
        name={profile.name ?? "Usuário"}
        email={profile.email ?? ""}
        balance={Number(wallet?.balance ?? 0)}
        isAdmin={profile.role === "admin"}
        section="user"
      >
        {children}
      </AppShell>
      <AnnouncementPopup announcement={announcement} />
    </>
  );
}
