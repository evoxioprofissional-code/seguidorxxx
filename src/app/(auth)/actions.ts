"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, signupSchema, onlyDigits } from "@/lib/validations";
import { claimReferralByCode } from "@/lib/referral";
import { normalizeReferralCode, REFERRAL_COOKIE } from "@/lib/referral-code";

export type AuthResult = { error?: string; success?: boolean };

export async function signInAction(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }
  revalidatePath("/", "layout");
  return { success: true };
}

export async function signUpAction(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    whatsapp: formData.get("whatsapp"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const whatsapp = onlyDigits(parsed.data.whatsapp);

  // O código também pode vir do cookie, caso o usuário tenha navegado antes.
  const cookieStore = await cookies();
  const refCode = normalizeReferralCode(
    String(formData.get("ref") || "") || cookieStore.get(REFERRAL_COOKIE)?.value
  );
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name, whatsapp, referral_code: refCode },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already"))
      return { error: "Este e-mail já está cadastrado." };
    return { error: error.message };
  }

  // Garante o WhatsApp no perfil (o trigger já cria o profile no cadastro).
  if (data.user) {
    try {
      await createAdminClient()
        .from("profiles")
        .update({ whatsapp })
        .eq("id", data.user.id);

      if (refCode) {
        await claimReferralByCode(data.user.id, refCode);
        cookieStore.delete(REFERRAL_COOKIE);
      }
    } catch {
      /* o trigger já tenta criar o vínculo; não bloqueia o cadastro */
    }
  }

  // Se confirmação de e-mail estiver desativada, já vem sessão.
  if (data.session) {
    revalidatePath("/", "layout");
    return { success: true };
  }
  return { success: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
