import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/orders.schema";
import {
  calculateOrderTotals,
  generateOrderNumber,
  generateToken,
  OrderValidationError,
} from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  normalizeCode,
  evaluateDiscount,
  mapDiscountCodeRow,
  type DiscountCode,
} from "@/lib/discounts";

// @react-pdf/renderer (Fase 5, comprobante) no corre en Edge, y acá se
// necesita node:crypto para el token — todo el subsistema de pedidos usa
// runtime Node.
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const { items, customer, discountCode: rawDiscountCode } = parsed.data;

  // El servidor jamás confía en montos que manda el cliente: acá se
  // recalcula todo desde products.ts. Cualquier `total` que venga en el
  // body ya fue descartado por el schema — y lo mismo para `discount`, que
  // ni siquiera es un campo del schema. Primera pasada sin descuento: hace
  // falta el subtotal crudo para evaluar el código contra min_order_total.
  let baseTotals;
  try {
    baseTotals = calculateOrderTotals(items);
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
      return NextResponse.json(
        { error: evaluation.message, reason: evaluation.reason },
        { status: 409 }
      );
    }
    // evaluateDiscount(null, ...) siempre devuelve valid:false (reason
    // "not_found"), así que si llegamos acá `candidate` no puede ser null —
    // pero se chequea explícito en vez de un `!` para que TypeScript lo vea
    // sin necesidad de confiar a ciegas en esa invariante.
    if (candidate === null) {
      return NextResponse.json(
        { error: "No pudimos validar el código." },
        { status: 500 }
      );
    }

    discountCodeRow = candidate;
    discountAmount = evaluation.amount;
    discountLabel = evaluation.label;
  }

  // Segunda pasada: ahora con el descuento evaluado, para que el umbral de
  // envío gratis se calcule sobre subtotal-después-de-descuento (orden
  // canónico de 00-contexto.md §6).
  const totals = calculateOrderTotals(items, discountAmount);

  const orderNumber = generateOrderNumber();
  const token = generateToken();

  // orders + order_items (+ discount_redemptions si hay código) se insertan
  // en una sola transacción dentro de la función de Postgres — incluido el
  // reclamo atómico de used_count. Sin delete de compensación.
  const { data: created, error: rpcError } = await supabaseAdmin
    .rpc("create_order", {
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
        discount_code_id: discountCodeRow?.id ?? null,
        discount_code: discountCodeRow?.code ?? null,
        discount_code_label: discountLabel,
        items: totals.lines.map((line) => ({
          slug: line.slug,
          name: line.name,
          dose: line.dose,
          unit_price: line.unitPrice,
          quantity: line.quantity,
          line_total: line.lineTotal,
        })),
      },
    })
    .single();

  if (rpcError || !created) {
    // SQLSTATE propio: el update atómico de used_count no reservó ningún
    // uso (código agotado entre la validación de arriba y este momento).
    if (rpcError?.code === "NGL01") {
      return NextResponse.json(
        { error: "Este código ya alcanzó su límite de usos.", reason: "exhausted" },
        { status: 409 }
      );
    }
    console.error("create_order_failed", rpcError?.code);
    return NextResponse.json(
      { error: "No pudimos registrar el pedido. Probá de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { token: created.token, orderNumber: created.order_number },
    { status: 201 }
  );
}
