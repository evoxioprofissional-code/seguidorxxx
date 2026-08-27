import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Revoga (desativa) uma API key do próprio usuário. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: owned } = await admin
    .from("api_keys")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!owned) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });

  await admin.from("api_keys").update({ active: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
