"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRecentOrders } from "@/lib/recent-orders";
import { formatRelativeDays } from "@/lib/format";

/**
 * "Mis pedidos": rastro discreto en localStorage de los pedidos que hizo
 * este navegador (sin datos personales, solo número + fecha + link). Sin
 * cuenta ni correo, el token es la única llave — esto es lo único que le
 * queda al comprador si cierra la pestaña antes de guardar el link.
 */
export function RecentOrdersList() {
  const orders = useRecentOrders((s) => s.orders);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useRecentOrders.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useRecentOrders.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated || orders.length === 0) return null;

  return (
    <details className="group">
      <summary className="focus-ring cursor-pointer list-none rounded text-sm font-semibold tracking-wide marker:content-none">
        Mis pedidos
      </summary>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {orders.map((order) => (
          <li key={order.token} className="flex items-center justify-between gap-2">
            <Link
              href={`/pedido/${order.token}`}
              className="focus-ring rounded font-mono hover:text-foreground hover:underline"
            >
              {order.orderNumber}
            </Link>
            <span className="text-xs text-muted/70">{formatRelativeDays(order.createdAt)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
