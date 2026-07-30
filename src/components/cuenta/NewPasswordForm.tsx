"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { newPasswordSchema } from "@/lib/customer.schema";

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = newPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Contraseña inválida.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cuenta/nueva-contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos actualizar la contraseña.");
        return;
      }

      router.push("/cuenta/pedidos");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Nueva contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          className="focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || password.length === 0}
        className="focus-ring w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
