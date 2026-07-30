import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderByToken } from "@/lib/orders-data";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppUrl, siteConfig } from "@/config/site";
import { PaymentInstructions } from "@/components/PaymentInstructions";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";
import { SaveRecentOrderOnMount } from "@/components/SaveRecentOrderOnMount";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";

export const metadata: Metadata = {
  title: "Tu pedido",
  robots: { index: false, follow: false },
};

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  const receiptUrl = `${siteConfig.url}/pedido/${order.token}`;
  const whatsappMessage = [
    `Hola ${siteConfig.name}, hice el pedido ${order.orderNumber}.`,
    `Total: ${formatPrice(order.total)}`,
    `Comprobante: ${receiptUrl}`,
    "",
    "Ya hice la transferencia, acá va la captura 👇",
  ].join("\n");

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <ClearCartOnMount />
      <SaveRecentOrderOnMount
        token={order.token}
        orderNumber={order.orderNumber}
        createdAt={order.createdAt}
      />

      <p className="eyebrow mb-2">Pedido registrado</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Pedido {order.orderNumber}
      </h1>
      <p className="mt-2 text-sm text-muted">{formatOrderDate(order.createdAt)}</p>

      <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium leading-relaxed text-danger">
        Guardá este link: es la única forma de volver a ver tu pedido. No hay
        cuenta ni correo asociado.
      </p>

      <PaymentInstructions total={order.total} />

      <p className="mt-6 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-muted">
        Transferí o escaneá el QR por{" "}
        <strong className="text-foreground">{formatPrice(order.total)}</strong>, y mandanos
        la captura por WhatsApp junto con tu número de pedido.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <WhatsAppCtaButton
          href={buildWhatsAppUrl(whatsappMessage)}
          label="Enviar comprobante por WhatsApp"
          variant="solid"
          analyticsEvent="whatsapp_click_order_confirmation"
        />
        <a
          href={`/api/pedido/${order.token}/comprobante`}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-2 sm:w-auto"
        >
          Descargar comprobante (PDF)
        </a>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Resumen del pedido</h2>
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.slug} className="flex justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-muted">
                  {item.dose} x{item.quantity}
                </p>
              </div>
              <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">
                Descuento{order.discountCodeLabel ? ` (${order.discountCodeLabel})` : ""}
              </span>
              <span className="text-accent-light">−{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Envío</span>
            <span>{formatPrice(order.shipping)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/catalogo" className="focus-ring rounded hover:text-foreground">
          Seguir viendo productos
        </Link>
      </p>
    </div>
  );
}
