import { z } from "zod";

/**
 * Normaliza un WhatsApp boliviano a solo dígitos. Acepta con o sin "+591",
 * espacios o guiones — la gente lo escribe de mil formas, no hay que ser
 * rígido. Solo se valida el largo final.
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

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre completo.").max(120),
  phone: phoneSchema,
  city: z.string().trim().min(2, "Ingresá tu ciudad.").max(80),
  address: optionalText(300),
  note: optionalText(500),
});

export const orderItemInputSchema = z.object({
  slug: z.string().trim().min(1),
  quantity: z.number().int().positive().max(99),
});

export const checkoutSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "El carrito está vacío."),
  customer: customerSchema,
  // Solo el string del código. El monto del descuento lo calcula siempre el
  // servidor con evaluateDiscount() — nunca se acepta un monto del cliente.
  discountCode: z.string().trim().min(1).max(40).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
