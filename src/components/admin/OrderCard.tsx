import { formatPrice, formatRelativeDays, daysSince } from "@/lib/format";
import { parseOrderStatus } from "@/lib/orders-data";
import { buildCustomerWhatsAppUrl } from "@/lib/whatsapp";
import type { Database } from "@/types/database";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";

export type OrderWithItems = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items: Database["public"]["Tables"]["order_items"]["Row"][];
};

// Un pendiente de más de esto se destaca: probablemente quedó abandonado,
// no es "recién hecho, esperando el depósito" (C2, 00-contexto.md).
const STALE_PENDING_DAYS = 3;

export function OrderCard({ order }: { order: OrderWithItems }) {
  const status = parseOrderStatus(order.status);
  const createdAt = new Date(order.created_at).toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const isStalePending = status === "pending" && daysSince(order.created_at) >= STALE_PENDING_DAYS;

  return (
    <article
      className={`rounded-xl border bg-surface p-4 sm:p-5 ${
        isStalePending ? "border-danger/40" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold">{order.order_number}</p>
          <p className="text-xs text-muted">
            {createdAt} ·{" "}
            <span className={isStalePending ? "font-medium text-danger" : undefined}>
              {formatRelativeDays(order.created_at)}
            </span>
          </p>
        </div>
        <OrderStatusControl
          orderId={order.id}
          status={status}
          orderNumber={order.order_number}
          customerPhone={order.customer_phone}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 text-sm">
          <p className="font-medium">{order.customer_name}</p>
          <a
            href={buildCustomerWhatsAppUrl(order.customer_phone, order.order_number, status)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring block rounded text-accent-light hover:underline"
          >
            {order.customer_phone}
          </a>
          <p className="text-muted">{order.customer_city}</p>
          {order.customer_address && <p className="text-muted">{order.customer_address}</p>}
        </div>

        <div className="space-y-1 text-sm text-muted">
          {order.order_items.map((item) => (
            <p key={item.id}>
              {item.name} {item.dose} x{item.quantity}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-lg font-bold">{formatPrice(order.total)}</span>
        <a
          href={`/api/pedido/${order.token}/comprobante`}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded text-sm font-medium text-accent-light hover:underline"
        >
          Ver comprobante (PDF)
        </a>
      </div>
    </article>
  );
}
