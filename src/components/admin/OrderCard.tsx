import { formatPrice, formatRelativeDays } from "@/lib/format";
import { parseOrderStatus, type OrderStatus } from "@/lib/orders-data";
import { buildCustomerWhatsAppUrl } from "@/lib/whatsapp";
import type { Database } from "@/types/database";

export type OrderWithItems = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items: Database["public"]["Tables"]["order_items"]["Row"][];
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "Pagado",
  shipped: "Despachado",
};

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  paid: "border-success bg-success/10 text-success",
  shipped: "border-accent bg-accent/10 text-accent-light",
};

export function OrderCard({ order }: { order: OrderWithItems }) {
  const status = parseOrderStatus(order.status);
  const createdAt = new Date(order.created_at).toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <article className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold">{order.order_number}</p>
          <p className="text-xs text-muted">
            {createdAt} · {formatRelativeDays(order.created_at)}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
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
