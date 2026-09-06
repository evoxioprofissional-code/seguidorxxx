import { createClient } from "@/lib/supabase/server";
import { AccountSettings } from "@/components/account/account-settings";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", user?.id ?? "")
    .single<Pick<Profile, "name" | "email">>();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="display text-[2rem] leading-none">Conta</h1>
        <p className="mt-1 text-sm text-fg-muted">Gerencie seu nome e sua senha.</p>
      </div>
      <AccountSettings
        name={profile?.name ?? ""}
        email={profile?.email ?? user?.email ?? ""}
      />
    </div>
  );
}
