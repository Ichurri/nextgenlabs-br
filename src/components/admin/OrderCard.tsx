import { formatPrice, formatRelativeDays } from "@/lib/format";
import { buildCustomerWhatsAppUrl } from "@/lib/whatsapp";
import type { Database } from "@/types/database";

export type OrderWithItems = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items: Database["public"]["Tables"]["order_items"]["Row"][];
};

export function OrderCard({ order, highlight }: { order: OrderWithItems; highlight?: boolean }) {
  const createdAt = new Date(order.created_at).toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <article
      className={`rounded-xl border border-border bg-surface p-4 sm:p-5 ${
        highlight ? "ring-1 ring-success" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold">{order.order_number}</p>
          <p className="text-xs text-muted">
            {createdAt} · {formatRelativeDays(order.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 text-sm">
          <p className="font-medium">{order.customer_name}</p>
          <p className="text-muted">{order.customer_phone}</p>
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
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <a
            href={`/api/pedido/${order.token}/comprobante?descargar=1`}
            className="focus-ring rounded font-medium text-accent-light hover:underline"
          >
            Descargar comprobante
          </a>
          <a
            href={buildCustomerWhatsAppUrl(order.customer_phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded font-medium text-accent-light hover:underline"
          >
            Enviar por WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
