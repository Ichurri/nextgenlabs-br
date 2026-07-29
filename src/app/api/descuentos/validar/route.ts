import { NextResponse } from "next/server";
import { z } from "zod";
import { orderItemInputSchema } from "@/lib/orders.schema";
import { calculateOrderTotals, OrderValidationError } from "@/lib/orders";
import { normalizeCode, evaluateDiscount, mapDiscountCodeRow } from "@/lib/discounts";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const validateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  items: z.array(orderItemInputSchema).min(1),
});

/**
 * Solo para mostrarle el descuento al comprador antes de confirmar. NO es
 * autoritativo: POST /api/pedidos vuelve a evaluar el código desde cero, sin
 * confiar en nada de lo que devolvió este endpoint.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  // Recibe los items, no el subtotal: el servidor lo recalcula siempre,
  // incluso acá donde "solo es para mostrar".
  let subtotal: number;
  try {
    subtotal = calculateOrderTotals(parsed.data.items).subtotal;
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const normalized = normalizeCode(parsed.data.code);
  const { data: row } = await supabaseAdmin
    .from("discount_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  const result = evaluateDiscount(row ? mapDiscountCodeRow(row) : null, subtotal, new Date());

  // owner_label es información interna del negocio: mapDiscountCodeRow() la
  // trae, pero DiscountResult nunca la incluye — evaluateDiscount() solo
  // devuelve `label` (el descriptivo para el comprador) o `message`.
  return NextResponse.json(result);
}
