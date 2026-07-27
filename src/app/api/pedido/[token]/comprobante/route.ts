import { getOrderByToken } from "@/lib/orders-data";
import { renderOrderReceiptPdf } from "@/lib/pdf/OrderReceipt";

// @react-pdf/renderer no funciona en el runtime Edge.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const order = await getOrderByToken(token);

  // Token inválido → 404. Nunca revelamos si el token existió alguna vez.
  if (!order) {
    return new Response("Not found", { status: 404 });
  }

  const pdfBuffer = await renderOrderReceiptPdf(order);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Pedido-${order.orderNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
