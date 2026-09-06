"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountResult = { error?: string; success?: string };

/** Troca o nome do perfil (sem confirmação). */
export async function updateNameAction(
  _prev: AccountResult,
  formData: FormData
): Promise<AccountResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe um nome válido." };
  if (name.length > 60) return { error: "Nome muito longo (máx. 60)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // metadata do auth + tabela profiles (fonte exibida no painel)
  await supabase.auth.updateUser({ data: { name } });
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ name }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar o nome." };

  revalidatePath("/", "layout");
  return { success: "Nome atualizado!" };
}

/** Troca a senha diretamente — sem pedir a senha atual nem confirmação. */
export async function updatePasswordAction(
  _prev: AccountResult,
  formData: FormData
): Promise<AccountResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6)
    return { error: "A senha precisa de pelo menos 6 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message || "Não foi possível trocar a senha." };

  return { success: "Senha alterada com sucesso!" };
}
