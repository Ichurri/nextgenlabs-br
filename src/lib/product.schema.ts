import { z } from "zod";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Compartido entre POST y PATCH /api/admin/productos: el formulario del
// panel siempre manda el objeto completo. El slug viaja en el payload
// también al editar (el input queda deshabilitado en el cliente), pero la
// Route Handler de PATCH nunca lo escribe — es inmutable, ver §5 del plan.
export const productFieldsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_RE, "El slug tiene que ser minúsculas y guiones, sin espacios ni acentos."),
  name: z.string().trim().min(1, "Ingresá el nombre."),
  dose: z.string().trim().min(1, "Ingresá la dosis."),
  price: z.number().nonnegative("El precio no puede ser negativo."),
  purity: z.string().trim().min(1, "Ingresá la pureza."),
  form: z.string().trim().min(1, "Ingresá la forma."),
  categoryId: z.string().uuid("Elegí una categoría."),
  image: z.string().trim().min(1, "Cargá o pegá una imagen."),
  highlights: z
    .array(z.string().trim().min(1))
    .min(1, "Agregá al menos un beneficio.")
    .max(6, "Máximo 6 beneficios."),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  coaUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  featured: z.boolean(),
  isNew: z.boolean(),
  trackStock: z.boolean(),
});

export type ProductFields = z.infer<typeof productFieldsSchema>;

export const archiveProductSchema = z.object({ isActive: z.boolean() });
