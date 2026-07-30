"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { registerSchema } from "@/lib/customer.schema";

type FormState = {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  email: string;
  password: string;
};

const emptyForm: FormState = {
  fullName: "",
  phone: "",
  city: "",
  address: "",
  email: "",
  password: "",
};

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && key in emptyForm) {
          fieldErrors[key as keyof FormState] = issue.message;
        }
      }
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) {
        setSubmitError(parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.");
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cuenta/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSubmitError(body?.error ?? "No pudimos crear la cuenta. Probá de nuevo.");
        return;
      }

      router.push(next && next.startsWith("/") ? next : "/cuenta/pedidos");
      router.refresh();
    } catch {
      setSubmitError(
        "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <Field label="Nombre completo" error={errors.fullName}>
        <input
          value={form.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
          autoComplete="name"
          className={inputClass(!!errors.fullName)}
        />
      </Field>
      <Field label="WhatsApp" error={errors.phone}>
        <input
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="69437674"
          className={inputClass(!!errors.phone)}
        />
      </Field>
      <Field label="Ciudad" error={errors.city}>
        <input
          value={form.city}
          onChange={(e) => updateField("city", e.target.value)}
          autoComplete="address-level2"
          className={inputClass(!!errors.city)}
        />
      </Field>
      <Field label="Dirección o referencia (opcional)" error={errors.address}>
        <input
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          autoComplete="street-address"
          className={inputClass(!!errors.address)}
        />
      </Field>
      <Field label="Correo" error={errors.email}>
        <input
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          autoComplete="email"
          className={inputClass(!!errors.email)}
        />
      </Field>
      <Field label="Contraseña" error={errors.password}>
        <input
          type="password"
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          autoComplete="new-password"
          className={inputClass(!!errors.password)}
        />
      </Field>

      {submitError && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}

function inputClass(hasError: boolean): string {
  return `focus-ring w-full rounded-lg border bg-surface-2 px-4 py-3 text-sm outline-none transition ${
    hasError ? "border-danger" : "border-border"
  }`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
