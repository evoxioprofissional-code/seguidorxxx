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

export const depositSchema = z.object({
  amount: z.coerce.number().positive("Valor inválido").max(50000, "Valor muito alto"),
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
