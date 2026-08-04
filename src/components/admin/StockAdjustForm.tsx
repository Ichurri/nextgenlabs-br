"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function StockAdjustForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (quantity === 0) {
      setError("La cantidad no puede ser 0.");
      return;
    }
    if (reason.trim().length === 0) {
      setError("Ingresá el motivo.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/admin/productos/${productId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, reason: reason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos ajustar el stock.");
        return;
      }
      setQuantity(0);
      setReason("");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold">Ajustar stock</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">
            Cantidad (positivo suma, negativo resta)
          </span>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            step="1"
            className="focus-ring w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Motivo</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Reposición de lote 4"
            className="focus-ring w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="focus-ring rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Registrar ajuste"}
      </button>
    </form>
  );
}
