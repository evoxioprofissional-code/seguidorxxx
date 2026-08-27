import { requireProfile } from "@/lib/auth";
import { getBalance } from "@/lib/queries";
import { AppShell } from "@/components/dashboard/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const balance = await getBalance();

  return (
    <AppShell
      name={profile.name ?? "Usuário"}
      email={profile.email ?? ""}
      balance={balance}
      isAdmin={profile.role === "admin"}
      section="user"
    >
      {children}
    </AppShell>
  );
}
