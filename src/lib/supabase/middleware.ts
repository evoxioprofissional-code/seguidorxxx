import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/** Rotas que exigem sessão. */
const PROTECTED_PREFIXES = ["/dashboard", "/services", "/orders", "/wallet", "/admin"];
/** Rotas de auth: se logado, redireciona pro dashboard. */
const AUTH_PREFIXES = ["/login", "/cadastro"];

// Tempo máximo esperando o Supabase Auth responder DENTRO do middleware.
// Se estourar, tratamos como "sem sessão" para NÃO derrubar o site com 504
// (MIDDLEWARE_INVOCATION_TIMEOUT da Vercel) quando o Auth ficar lento/travar.
const AUTH_TIMEOUT_MS = 3000;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: não colocar lógica entre createServerClient e getUser().
  // Corrida com um tempo-limite: se o Auth do Supabase travar/demorar, a Promise
  // rejeita e seguimos como "sem usuário" (fail-safe), em vez de pendurar até a
  // Vercel matar o middleware em 25s (MIDDLEWARE_INVOCATION_TIMEOUT / 504).
  let user = null;
  try {
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("auth-timeout")), AUTH_TIMEOUT_MS)
      ),
    ]);
    user = data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuth = AUTH_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (isAuth && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
