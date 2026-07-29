"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscountCodeFields } from "@/lib/discount-code.schema";

// El toggle manda el objeto completo con isActive invertido — no hay PATCH
// parcial, ver el comentario en la Route Handler.
export function DiscountCodeToggle({ id, fields }: { id: string; fields: DiscountCodeFields }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/codigos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, isActive: !fields.isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos actualizar el código.");
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="focus-ring rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {fields.isActive ? "Desactivar" : "Activar"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
