import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED = [
  "minimum_deposit",
  "minimum_margin",
  "provider_low_balance_threshold",
  "maintenance_mode",
  "orders_enabled",
];

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const db = createAdminClient();
  const updates = Object.entries(body).filter(([k]) => ALLOWED.includes(k));

  for (const [key, value] of updates) {
    await db.from("app_settings").upsert(
      { key, value: value as never, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  }

  return NextResponse.json({ ok: true, updated: updates.length });
}
