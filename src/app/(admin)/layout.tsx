import { requireAdmin } from "@/lib/auth";
import { getBalance } from "@/lib/queries";
import { AppShell } from "@/components/dashboard/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  const balance = await getBalance();

  return (
    <AppShell
      name={profile.name ?? "Admin"}
      email={profile.email ?? ""}
      balance={balance}
      isAdmin
      section="admin"
    >
      {children}
    </AppShell>
  );
}
