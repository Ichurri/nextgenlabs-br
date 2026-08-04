import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { orderItemInputSchema, customerSchema } from "@/lib/orders.schema";
import { calculateOrderTotals, generateOrderNumber, OrderValidationError } from "@/lib/orders";
import { normalizeCode, evaluateDiscount, mapDiscountCodeRow, type DiscountCode } from "@/lib/discounts";
import { renderOrderReceiptPdf } from "@/lib/pdf/OrderReceipt";
import type { ReceiptData } from "@/lib/orders-data";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCatalog } from "@/lib/products-data";

// @react-pdf/renderer no corre en Edge.
export const runtime = "nodejs";

const receiptSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "El comprobante no tiene ítems."),
  customer: customerSchema,
  discountCode: z.string().trim().min(1).max(40).optional(),
});

/**
 * Genera el PDF de un comprobante a partir de lo que el admin leyó de un
 * mensaje de WhatsApp y corrigió a mano. No persiste ningún pedido — ni
 * `orders`, ni token, ni estado en la base — es un PDF y se acabó (Fase 9
 * §1.3). El único registro que queda, si hay código de descuento, es la
 * redención: es lo único que sostiene el reporte por influencer.
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
  const catalog = await getCatalog();
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

  // Reclama el uso ANTES de renderizar: si el código se agotó entre la
  // validación de arriba y este momento, no se genera ningún PDF.
  if (discountCodeRow) {
    const { error: claimError } = await supabaseAdmin.rpc("claim_discount_code_use", {
      p_code_id: discountCodeRow.id,
    });

    if (claimError) {
      if (claimError.code === "NGL01") {
        return NextResponse.json(
          { error: "Este código ya alcanzó su límite de usos." },
          { status: 409 }
        );
      }
      console.error("claim_discount_code_use_failed", claimError.code);
      return NextResponse.json({ error: "No pudimos validar el código." }, { status: 500 });
    }

    const { error: insertError } = await supabaseAdmin.from("discount_redemptions").insert({
      code_id: discountCodeRow.id,
      code: discountCodeRow.code,
      discount_amount: totals.discount,
      receipt_number: orderNumber,
      receipt_total: totals.total,
      customer_name: customer.name,
      is_paid: true,
    });

    if (insertError) {
      console.error("insert_redemption_failed", insertError.code);
      return NextResponse.json(
        { error: "No pudimos registrar el uso del código." },
        { status: 500 }
      );
    }
  }

  const receipt: ReceiptData = {
    orderNumber,
    createdAt: new Date().toISOString(),
    // Todo comprobante generado acá ya está pagado — no hay estado "pendiente"
    // en este flujo (ver ORDER_STATUSES en orders-data.ts).
    status: "paid",
    customerName: customer.name,
    customerPhone: customer.phone,
    customerCity: customer.city,
    customerAddress: customer.address ?? null,
    subtotal: totals.subtotal,
    discount: totals.discount,
    discountCode: discountCodeRow?.code ?? null,
    discountCodeLabel: discountLabel,
    shipping: totals.shipping,
    total: totals.total,
    items: totals.lines,
  };

  const pdfBuffer = await renderOrderReceiptPdf(receipt);

  // El comprobante ya existe en este punto: si el descuento de stock falla,
  // logueamos y devolvemos el PDF igual con un aviso — perder el descuento
  // de stock es molesto, perder el comprobante de una venta real es peor
  // (§5 Bloque E del plan).
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="Comprobante-${orderNumber}.pdf"`,
    "Cache-Control": "private, no-store",
  };

  try {
    const { data: batchId, error: stockError } = await supabaseAdmin.rpc("register_sale_stock", {
      payload: {
        receipt_number: orderNumber,
        items: totals.lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
      },
    });

    if (stockError) {
      console.error("register_sale_stock_failed", stockError.code);
      headers["X-Stock-Warning"] = "1";
    } else if (batchId) {
      headers["X-Stock-Batch-Id"] = batchId;
    }
  } catch (err) {
    console.error("register_sale_stock_threw", err);
    headers["X-Stock-Warning"] = "1";
  }

  revalidateTag("catalog", { expire: 0 });

  return new Response(new Uint8Array(pdfBuffer), { headers });
}
