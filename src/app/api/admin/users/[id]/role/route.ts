import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/** POST { role: "admin" | "user" }: promove ou remove admin de uma conta. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const { id } = await params;
  let body: { role?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const role = body.role;
  if (role !== "admin" && role !== "user")
    return NextResponse.json({ error: "Papel inválido." }, { status: 400 });

  const db = createAdminClient();
  const { data: target } = await db
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .single();
  if (!target)
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (target.role === role) return NextResponse.json({ ok: true, role });

  // Nunca deixar o sistema sem nenhum admin.
  if (role === "user") {
    const { count } = await db
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1)
      return NextResponse.json(
        { error: "Não é possível remover o último admin. Promova outra conta antes." },
        { status: 400 }
      );
  }

  const { error } = await db.from("profiles").update({ role }).eq("id", id);
  if (error)
    return NextResponse.json({ error: "Falha ao atualizar a permissão." }, { status: 500 });

  return NextResponse.json({ ok: true, role });
}
