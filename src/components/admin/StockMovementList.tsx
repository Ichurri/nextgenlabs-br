"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";

type StockMovementRow = Database["public"]["Tables"]["stock_movements"]["Row"];

const TYPE_LABEL: Record<string, string> = {
  sale: "Venta",
  restock: "Reposición",
  adjustment: "Ajuste",
  revert: "Deshecho",
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  }).format(new Date(iso));
}

export function StockMovementList({ movements }: { movements: StockMovementRow[] }) {
  if (movements.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay movimientos de stock.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {movements.map((m) => (
        <MovementRow key={m.id} movement={m} />
      ))}
    </ul>
  );
}

function MovementRow({ movement }: { movement: StockMovementRow }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUndo = movement.type === "sale" && movement.batch_id && !movement.reverted_at;

  async function undo() {
    if (!movement.batch_id) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stock/${movement.batch_id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos deshacer el movimiento.");
        return;
      }
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p>
          <span className="font-medium">{TYPE_LABEL[movement.type] ?? movement.type}</span>
          {" · "}
          <span className={movement.qty < 0 ? "text-danger" : "text-success"}>
            {movement.qty > 0 ? `+${movement.qty}` : movement.qty}
          </span>
          {" · stock resultante "}
          <span className="font-medium">{movement.stock_after}</span>
        </p>
        <p className="text-xs text-muted">
          {formatDateTime(movement.created_at)}
          {movement.receipt_number && ` · ${movement.receipt_number}`}
          {movement.reason && ` · ${movement.reason}`}
          {movement.reverted_at && " · deshecho"}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      {canUndo && (
        <button
          type="button"
          onClick={undo}
          disabled={pending}
          className="focus-ring shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Deshaciendo…" : "Deshacer"}
        </button>
      )}
    </li>
  );
}
