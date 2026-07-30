"use client";

import { useState, type FormEvent } from "react";
import { recoverSchema } from "@/lib/customer.schema";

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = recoverSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ingresá un correo válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cuenta/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      // Siempre el mismo resultado de éxito: no hay que confirmar ni negar
      // si ese correo tiene cuenta.
      if (res.ok) setSent(true);
      else setError("No pudimos procesar el pedido. Probá de nuevo.");
    } catch {
      setError("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p
        role="status"
        className="mt-6 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-muted"
      >
        Si ese correo tiene una cuenta, te mandamos un link para recuperar tu contraseña.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Correo</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
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
        disabled={isSubmitting || email.trim().length === 0}
        className="focus-ring w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Enviando…" : "Mandar link de recuperación"}
      </button>
    </form>
  );
}
