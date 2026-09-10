import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { normalizeReferralCode, REFERRAL_COOKIE } from "@/lib/referral-code";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const referralCode = normalizeReferralCode(request.nextUrl.searchParams.get("ref"));

  if (referralCode) {
    response.cookies.set(REFERRAL_COOKIE, referralCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Todas as rotas exceto:
     * - _next/static, _next/image, favicon
     * - arquivos estáticos (svg, png, etc.)
     * - api (rotas de API cuidam da própria auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
