import { z } from "zod";

// Compartido entre POST y PATCH /api/admin/codigos: el formulario del panel
// siempre manda el objeto completo, tanto al crear como al editar.
export const discountCodeFieldsSchema = z
  .object({
    code: z.string().trim().min(4, "El código necesita al menos 4 caracteres.").max(40),
    type: z.enum(["percent", "fixed"]),
    value: z.number().positive("El valor tiene que ser mayor a 0."),
    ownerLabel: z.string().trim().min(1, "Ingresá de quién es el código.").max(200),
    isActive: z.boolean(),
    maxUses: z.number().int().positive().nullable(),
    expiresAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")
      .nullable(),
    minOrderTotal: z.number().nonnegative().nullable(),
    maxDiscount: z.number().positive().nullable(),
  })
  .refine((data) => data.type !== "percent" || (data.value >= 1 && data.value <= 50), {
    message: "Un código de porcentaje tiene que estar entre 1% y 50%.",
    path: ["value"],
  });

export type DiscountCodeFields = z.infer<typeof discountCodeFieldsSchema>;
