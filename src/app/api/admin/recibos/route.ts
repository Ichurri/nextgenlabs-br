import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { orderItemInputSchema, customerSchema } from "@/lib/orders.schema";
import {
  calculateOrderTotals,
  generateOrderNumber,
  generateToken,
  OrderValidationError,
} from "@/lib/orders";
import { normalizeCode, evaluateDiscount, mapDiscountCodeRow, type DiscountCode } from "@/lib/discounts";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAdminCatalog } from "@/lib/products-data";
import type { Catalog } from "@/lib/products.types";

const receiptSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "El comprobante no tiene ítems."),
  customer: customerSchema,
  discountCode: z.string().trim().min(1).max(40).optional(),
});

/**
 * Crea un pedido a partir de lo que el admin leyó de un mensaje de WhatsApp
 * y corrigió a mano. Persiste en `orders` + `order_items` vía create_order
 * (Fase 11) y descuenta stock; el PDF se genera on-demand desde
 * /api/pedido/[token]/comprobante.
 */
export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = receiptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const { items, customer, discountCode: rawDiscountCode } = parsed.data;

  // El servidor jamás confía en montos que vengan del body: acá se
  // recalcula todo desde el catálogo. Primera pasada sin descuento: hace
  // falta el subtotal crudo para evaluar el código contra min_order_total.
  //
  // El comprobante es de una venta que YA ocurrió por WhatsApp: se valida
  // contra el catálogo fresco del panel (el mismo que llena el selector de
  // ReceiptItemsEditor), no contra el cacheado del sitio público. Así el
  // precio y el stock son los de este segundo, y un producto archivado se
  // puede facturar igual.
  const { products, categories } = await getAdminCatalog();
  const catalog: Catalog = { products, categories: categories.map((c) => c.name) };
  let baseTotals;
  try {
    baseTotals = calculateOrderTotals(items, catalog, 0, customer.city);
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  let discountCodeRow: DiscountCode | null = null;
  let discountAmount = 0;
  let discountLabel: string | null = null;

  if (rawDiscountCode) {
    const normalized = normalizeCode(rawDiscountCode);
    const { data: row } = await supabaseAdmin
      .from("discount_codes")
      .select("*")
      .eq("code", normalized)
      .maybeSingle();

    const candidate: DiscountCode | null = row ? mapDiscountCodeRow(row) : null;
    const evaluation = evaluateDiscount(candidate, baseTotals.subtotal, new Date());
    if (!evaluation.valid) {
      return NextResponse.json({ error: evaluation.message }, { status: 400 });
    }
    // evaluateDiscount(null, ...) siempre devuelve valid:false, así que acá
    // `candidate` no puede ser null — se chequea explícito igual para que
    // TypeScript lo vea sin confiar a ciegas en esa invariante.
    if (candidate === null) {
      return NextResponse.json({ error: "No pudimos validar el código." }, { status: 500 });
    }

    discountCodeRow = candidate;
    discountAmount = evaluation.amount;
    discountLabel = evaluation.label;
  }

  // Segunda pasada: con el descuento evaluado, para que el umbral de envío
  // gratis se calcule sobre subtotal-después-de-descuento.
  const totals = calculateOrderTotals(items, catalog, discountAmount, customer.city);
  const orderNumber = generateOrderNumber();
  const token = generateToken();

  // El pedido, sus ítems, el claim del código y la redención entran en una
  // sola transacción (create_order). Si el código se agotó entre la
  // validación de arriba y este momento, no se crea nada.
  const { error: orderError } = await supabaseAdmin.rpc("create_order", {
    payload: {
      order_number: orderNumber,
      token,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_city: customer.city,
      customer_address: customer.address ?? null,
      customer_note: customer.note ?? null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      discount_code: discountCodeRow?.code ?? null,
      discount_code_label: discountLabel,
      discount_code_id: discountCodeRow?.id ?? null,
      items: totals.lines.map((line) => ({
        slug: line.slug,
        name: line.name,
        dose: line.dose,
        unit_price: line.unitPrice,
        quantity: line.quantity,
        line_total: line.lineTotal,
      })),
    },
  });

  if (orderError) {
    if (orderError.code === "NGL01") {
      return NextResponse.json(
        { error: "Este código ya alcanzó su límite de usos." },
        { status: 409 }
      );
    }
    console.error("create_order_failed", orderError.code);
    return NextResponse.json({ error: "No pudimos guardar el pedido." }, { status: 500 });
  }

  // El pedido ya existe: si el descuento de stock falla, se avisa y se sigue —
  // perder el descuento de stock es molesto, perder la venta es peor.
  let stockWarning = false;
  try {
    const { error: stockError } = await supabaseAdmin.rpc("register_sale_stock", {
      payload: {
        receipt_number: orderNumber,
        items: totals.lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
      },
    });
    if (stockError) {
      console.error("register_sale_stock_failed", stockError.code);
      stockWarning = true;
    }
  } catch (err) {
    console.error("register_sale_stock_threw", err);
    stockWarning = true;
  }

  revalidateTag("catalog", { expire: 0 });

  return NextResponse.json({ orderNumber, token, stockWarning }, { status: 201 });
}
