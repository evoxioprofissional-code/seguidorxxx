import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido");
export const passwordSchema = z
  .string()
  .min(6, "A senha precisa de pelo menos 6 caracteres");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha"),
});

/** Valida URL http/https e devolve normalizada. */
export const linkSchema = z
  .string()
  .trim()
  .min(3, "Informe o link")
  .refine(
    (v) => {
      try {
        const u = new URL(v.startsWith("http") ? v : `https://${v}`);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Link inválido" }
  )
  .transform((v) => (v.startsWith("http") ? v : `https://${v}`));

export const createOrderSchema = z.object({
  serviceId: z.string().uuid("Serviço inválido"),
  link: linkSchema,
  quantity: z.coerce.number().int().positive("Quantidade inválida"),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

/** Remove tudo que não for dígito (CPF/CNPJ, telefone, etc.). */
export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (len: number): number => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

/** Valida CPF (11 díg.) ou CNPJ (14 díg.) por dígito verificador. */
export function isValidCpfCnpj(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}

export const depositSchema = z.object({
  amount: z.coerce.number().positive("Valor inválido").max(50000, "Valor muito alto"),
  // CPF/CNPJ do pagador — exigido por gateways como o Asaas. Validado no servidor
  // apenas quando o perfil ainda não tem um cadastrado.
  cpf: z.string().trim().max(20).optional(),
});

export const adminServiceUpdateSchema = z.object({
  custom_name: z.string().trim().max(160).nullable().optional(),
  custom_description: z.string().trim().max(1000).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  platform: z.string().trim().max(60).nullable().optional(),
  pricing_mode: z.enum(["manual", "markup", "multiplier"]).optional(),
  sale_price: z.coerce.number().min(0).optional(),
  min_sale_price: z.coerce.number().min(0).optional(),
  markup_percentage: z.coerce.number().min(0).max(100000).optional(),
  multiplier: z.coerce.number().min(0).max(1000).optional(),
  minimum_margin_percentage: z.coerce.number().min(0).max(100000).optional(),
  min_quantity: z.coerce.number().int().min(1).optional(),
  max_quantity: z.coerce.number().int().min(1).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const adminAdjustBalanceSchema = z.object({
  userId: z.string().uuid(),
  amount: z.coerce.number().refine((v) => v !== 0, "Valor não pode ser zero"),
  reason: z.string().trim().min(3, "Informe o motivo"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
