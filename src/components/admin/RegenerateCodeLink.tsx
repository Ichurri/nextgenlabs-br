"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegenerateCodeLink({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    const confirmed = window.confirm(
      "Vas a generar un link nuevo y el anterior deja de funcionar. Vas a tener que pasarle el link nuevo a la persona. ¿Seguimos?"
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/codigos/${id}/link`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos regenerar el link.");
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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={regenerate}
        disabled={pending}
        className="focus-ring rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Generando…" : "Generar link nuevo"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
