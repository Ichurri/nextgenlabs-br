"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductArchiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (isActive) {
      const confirmed = window.confirm(
        "Archivar este producto lo saca del catálogo, del sitemap y de la búsqueda — su página pasa a dar 404. Podés reactivarlo cuando quieras. ¿Confirmás?"
      );
      if (!confirmed) return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/productos/${id}?accion=archivar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos actualizar el producto.");
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
        {isActive ? "Archivar" : "Reactivar"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
