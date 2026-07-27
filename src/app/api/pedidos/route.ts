import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/orders.schema";
import {
  calculateOrderTotals,
  generateOrderNumber,
  generateToken,
  OrderValidationError,
} from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  const { items, customer } = parsed.data;

  // El servidor jamás confía en montos que manda el cliente: acá se
  // recalcula todo desde products.ts. Cualquier `total` que venga en el
  // body ya fue descartado por el schema.
  let totals;
  try {
    totals = calculateOrderTotals(items);
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const orderNumber = generateOrderNumber();
  const token = generateToken();

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
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
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("create_order_failed", orderError);
    return NextResponse.json(
      { error: "No pudimos registrar el pedido. Probá de nuevo." },
      { status: 500 }
    );
  }

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
    totals.lines.map((line) => ({
      order_id: order.id,
      slug: line.slug,
      name: line.name,
      dose: line.dose,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      line_total: line.lineTotal,
    }))
  );

  if (itemsError) {
    console.error("create_order_items_failed", itemsError);
    // Compensación: si los ítems no se pudieron insertar, no dejamos una
    // orden huérfana sin productos.
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: "No pudimos registrar el pedido. Probá de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ token, orderNumber }, { status: 201 });
}
