"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DiscountCodeFields } from "@/lib/discount-code.schema";
import { Select } from "@/components/Select";
import { DatePicker } from "@/components/DatePicker";

type Props = {
  mode: "create" | "edit";
  codeId?: string;
  initialValues?: DiscountCodeFields;
};

const defaults: DiscountCodeFields = {
  code: "",
  type: "percent",
  value: 10,
  ownerLabel: "",
  isActive: true,
  maxUses: null,
  expiresAt: null,
  minOrderTotal: null,
  maxDiscount: null,
};

export function DiscountCodeForm({ mode, codeId, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<DiscountCodeFields>(initialValues ?? defaults);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof DiscountCodeFields>(key: K, value: DiscountCodeFields[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = mode === "create" ? "/api/admin/codigos" : `/api/admin/codigos/${codeId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos guardar el código.");
        return;
      }

      router.push("/admin/codigos");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field label="Código">
        <input
          value={values.code}
          onChange={(e) => update("code", e.target.value.toUpperCase())}
          placeholder="MAFE10"
          required
          minLength={4}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo">
          <Select
            value={values.type}
            onChange={(v) => update("type", v as DiscountCodeFields["type"])}
            options={[
              { value: "percent", label: "Porcentaje" },
              { value: "fixed", label: "Monto fijo" },
            ]}
            placeholder="Elegí un tipo"
          />
        </Field>
        <Field label={values.type === "percent" ? "Valor (%)" : "Valor (Bs)"}>
          <input
            type="number"
            // "|| ''" en vez de directo: si se deja en 0 (nunca es un valor
            // válido, el mínimo real es 1% o Bs 0.01) el campo se muestra
            // vacío en vez de "atascado" en 0 — así se puede borrar y
            // escribir un número nuevo sin pelear con el input controlado.
            value={values.value || ""}
            onChange={(e) => update("value", e.target.value === "" ? 0 : Number(e.target.value))}
            min={values.type === "percent" ? 1 : 0.01}
            max={values.type === "percent" ? 50 : undefined}
            step="0.01"
            required
            className={`${inputClass} no-spinner`}
          />
        </Field>
      </div>
      {values.type === "percent" && (
        <p className="-mt-3 text-xs text-muted">Entre 1% y 50%. La base no deja crear más.</p>
      )}

      <Field label="De quién es (nunca se muestra al comprador)">
        <input
          value={values.ownerLabel}
          onChange={(e) => update("ownerLabel", e.target.value)}
          placeholder="María Fernanda — IG @mafe"
          required
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => update("isActive", e.target.checked)}
          className="focus-ring h-4 w-4 rounded border-border"
        />
        Activo
      </label>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Usos máximos (vacío = ilimitado)">
          <input
            type="number"
            value={values.maxUses ?? ""}
            onChange={(e) => update("maxUses", e.target.value === "" ? null : Number(e.target.value))}
            min={1}
            step="1"
            className={`${inputClass} no-spinner`}
          />
        </Field>
        <Field label="Vence el (vacío = no vence)">
          <DatePicker
            value={values.expiresAt}
            onChange={(v) => update("expiresAt", v)}
            placeholder="Sin fecha"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Compra mínima en Bs (vacío = sin mínimo)">
          <input
            type="number"
            value={values.minOrderTotal ?? ""}
            onChange={(e) =>
              update("minOrderTotal", e.target.value === "" ? null : Number(e.target.value))
            }
            min={0}
            step="0.01"
            className={`${inputClass} no-spinner`}
          />
        </Field>
        {values.type === "percent" && (
          <Field label="Tope del descuento en Bs (vacío = sin tope)">
            <input
              type="number"
              value={values.maxDiscount ?? ""}
              onChange={(e) =>
                update("maxDiscount", e.target.value === "" ? null : Number(e.target.value))
              }
              min={0.01}
              step="0.01"
              className={`${inputClass} no-spinner`}
            />
          </Field>
        )}
      </div>

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
        disabled={isSubmitting}
        className="focus-ring w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Guardando…" : mode === "create" ? "Crear código" : "Guardar cambios"}
      </button>
    </form>
  );
}

const inputClass =
  "focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
