"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/lib/orders-data";
import { buildCustomerWhatsAppUrl } from "@/lib/whatsapp";

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagado" },
  { value: "shipped", label: "Despachado" },
  { value: "cancelled", label: "Cancelado" },
];

export function OrderStatusControl({
  orderId,
  status,
  orderNumber,
  customerPhone,
}: {
  orderId: string;
  status: OrderStatus;
  orderNumber: string;
  customerPhone: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Solo se muestra el botón de avisar después de un cambio confirmado en
  // esta sesión del panel — no al cargar la página con un estado ya viejo,
  // para no invitar a re-avisar de algo que ya se avisó hace rato.
  const [justChanged, setJustChanged] = useState(false);

  async function changeStatus(next: OrderStatus) {
    if (next === current || pending) return;
    setPending(true);
    setError(null);
    setJustChanged(false);
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos actualizar el estado.");
        return;
      }

      setCurrent(next);
      setJustChanged(true);
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.map((s) => (
        <button
          key={s.value}
          type="button"
          disabled={pending || s.value === current}
          onClick={() => changeStatus(s.value)}
          className={statusButtonClass(s.value, current)}
        >
          {s.label}
        </button>
      ))}
      {justChanged && (
        <a
          href={buildCustomerWhatsAppUrl(customerPhone, orderNumber, current)}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-light transition hover:bg-accent/20"
        >
          Avisar al comprador
        </a>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

function statusButtonClass(value: OrderStatus, current: OrderStatus): string {
  const base =
    "focus-ring rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed";

  if (value !== current) {
    return `${base} border-border text-muted hover:border-accent hover:text-accent-light`;
  }
  if (value === "paid") return `${base} border-success bg-success/10 text-success`;
  if (value === "shipped") return `${base} border-accent bg-accent/10 text-accent-light`;
  if (value === "cancelled") return `${base} border-danger bg-danger/10 text-danger`;
  return `${base} border-border bg-surface-2 text-foreground`;
}
