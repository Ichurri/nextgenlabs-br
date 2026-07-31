"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  // URL completa del PATCH que mueve el ítem, o null si ya está en la punta
  // (primero/último) y el botón tiene que quedar deshabilitado. Recibe la
  // URL en vez de un callback porque este componente lo usan tanto filas de
  // categoría como de producto — dos endpoints distintos — y así no hace
  // falta que el padre (a veces un Server Component) le pase una función.
  moveUpUrl: string | null;
  moveDownUrl: string | null;
};

/** Flechas ↑ ↓ reutilizables: reordenan categorías (Bloque D) y productos (Bloque C). */
export function SortControls({ moveUpUrl, moveDownUrl }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(url: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "PATCH" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos reordenar.");
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
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => moveUpUrl && move(moveUpUrl)}
        disabled={!moveUpUrl || pending}
        aria-label="Subir"
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => moveDownUrl && move(moveDownUrl)}
        disabled={!moveDownUrl || pending}
        aria-label="Bajar"
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↓
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
