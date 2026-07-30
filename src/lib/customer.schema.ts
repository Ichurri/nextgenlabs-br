import { z } from "zod";

/**
 * Mismo criterio que phoneSchema en orders.schema.ts: acepta el WhatsApp
 * escrito de cualquier forma (con o sin "+591", espacios, guiones) y lo
 * normaliza a solo dígitos. Se duplica acá en vez de importar de
 * orders.schema.ts porque ese archivo es del dominio de pedidos y este es de
 * cuentas — son responsabilidades distintas aunque la regla sea la misma.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(1, "Ingresá tu WhatsApp.")
  .transform((value) => value.replace(/\D/g, ""))
  .refine((digits) => digits.length >= 8 && digits.length <= 15, {
    message: "Ese WhatsApp no parece válido.",
  });

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Ingresá tu correo.")
  .email("Ese correo no parece válido.")
  .transform((value) => value.toLowerCase());

// Supabase Auth exige un mínimo de 6 caracteres por default; se pide 8 para
// no depender de ese default y ser explícito acá.
export const passwordSchema = z
  .string()
  .min(8, "La contraseña tiene que tener al menos 8 caracteres.")
  .max(72, "La contraseña es demasiado larga.");

export const customerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresá tu nombre completo.").max(120),
  phone: phoneSchema,
  city: z.string().trim().min(2, "Ingresá tu ciudad.").max(80),
  address: optionalText(300),
});

export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;

export const registerSchema = customerProfileSchema.extend({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const recoverSchema = z.object({
  email: emailSchema,
});

export type RecoverInput = z.infer<typeof recoverSchema>;

export const newPasswordSchema = z.object({
  password: passwordSchema,
});

export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
