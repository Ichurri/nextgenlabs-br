import { z } from "zod";

/**
 * Normaliza números brasileiros sem DDI para +55 e mantém números internacionais completos.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(1, "Informe seu WhatsApp.")
  .transform((value) => {
    const digits = value.replace(/\D/g, "");
    return !value.startsWith("+") && (digits.length === 10 || digits.length === 11)
      ? `55${digits}`
      : digits;
  })
  .refine((digits) => digits.length >= 8 && digits.length <= 15, {
    message: "Esse WhatsApp não parece válido.",
  });

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  phone: phoneSchema,
  city: z.string().trim().min(2, "Informe sua cidade.").max(80),
  address: optionalText(300),
  note: optionalText(500),
});

export const orderItemInputSchema = z.object({
  slug: z.string().trim().min(1),
  quantity: z.number().int().positive().max(99),
});

export const checkoutSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "O carrinho está vazio."),
  customer: customerSchema,
  // Solo el string del código. El monto del descuento lo calcula siempre el
  // servidor con evaluateDiscount() — nunca se acepta un monto del cliente.
  discountCode: z.string().trim().min(1).max(40).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
