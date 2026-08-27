import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminServiceUpdateSchema } from "@/lib/validations";
import { hasPricingWarning } from "@/lib/pricing";
import type { Service } from "@/types/database";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = adminServiceUpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );

  const db = createAdminClient();
  const { data: existing } = await db.from("services").select("*").eq("id", id).single<Service>();
  if (!existing) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

  const merged = { ...existing, ...parsed.data } as Service;
  const warn = hasPricingWarning(merged);

  const { data: updated, error } = await db
    .from("services")
    .update({ ...parsed.data, pricing_warning: warn })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Falha ao salvar." }, { status: 500 });
  return NextResponse.json({ ok: true, service: updated, pricing_warning: warn });
}
