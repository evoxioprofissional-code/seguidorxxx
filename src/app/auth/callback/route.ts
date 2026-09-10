import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { claimReferralByCode } from "@/lib/referral";
import { REFERRAL_COOKIE } from "@/lib/referral-code";

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const cookieStore = await cookies();
      const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value;
      if (data.user && referralCode) {
        try {
          await claimReferralByCode(data.user.id, referralCode);
          cookieStore.delete(REFERRAL_COOKIE);
        } catch (claimError) {
          console.error("[referral] OAuth claim falhou:", claimError);
        }
      }
      return NextResponse.redirect(`${base}${redirect}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=oauth`);
}
