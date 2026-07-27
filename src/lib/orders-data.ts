import { supabaseAdmin } from "@/lib/supabase-admin";

export type OrderItemRecord = {
  slug: string;
  name: string;
  dose: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  token: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string | null;
  customerNote: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  discountCode: string | null;
  discountCodeLabel: string | null;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
  items: OrderItemRecord[];
};

/**
 * Lee una orden completa por su token. Usado tanto por `/pedido/[token]`
 * (Server Component) como por la Route Handler del comprobante PDF, para no
 * duplicar la consulta a Supabase.
 */
export async function getOrderByToken(token: string): Promise<OrderRecord | null> {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (orderError || !order) return null;

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)
    .order("id", { ascending: true });

  if (itemsError) return null;

  return {
    id: order.id,
    orderNumber: order.order_number,
    token: order.token,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerCity: order.customer_city,
    customerAddress: order.customer_address,
    customerNote: order.customer_note,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shipping: Number(order.shipping),
    total: Number(order.total),
    discountCode: order.discount_code,
    discountCodeLabel: order.discount_code_label,
    status: order.status,
    createdAt: order.created_at,
    items: (items ?? []).map((item) => ({
      slug: item.slug,
      name: item.name,
      dose: item.dose,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
    })),
  };
}
