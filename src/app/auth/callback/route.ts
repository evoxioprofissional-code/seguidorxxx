import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

/**
 * Callback do OAuth (Google). O Supabase redireciona pra cá com um `code`;
 * trocamos por uma sessão (cookies) e mandamos o usuário pro destino.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawRedirect = url.searchParams.get("redirect") || "/dashboard";
  const redirect = rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";
  const base = publicEnv.appUrl || url.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${redirect}`);
  }

  return NextResponse.redirect(`${base}/login?error=oauth`);
}
