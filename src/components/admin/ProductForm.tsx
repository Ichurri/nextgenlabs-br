"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ProductFields } from "@/lib/product.schema";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

type Props = {
  mode: "create" | "edit";
  productId?: string;
  categories: { id: string; name: string }[];
  initialValues?: ProductFields;
};

function defaults(categories: { id: string; name: string }[]): ProductFields {
  return {
    slug: "",
    name: "",
    dose: "",
    price: 0,
    purity: "",
    form: "",
    categoryId: categories[0]?.id ?? "",
    image: "",
    highlights: [""],
    description: undefined,
    coaUrl: undefined,
    featured: false,
    isNew: false,
    trackStock: true,
  };
}

export function ProductForm({ mode, productId, categories, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFields>(initialValues ?? defaults(categories));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof ProductFields>(key: K, value: ProductFields[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function updateHighlight(index: number, text: string) {
    setValues((v) => ({
      ...v,
      highlights: v.highlights.map((h, i) => (i === index ? text : h)),
    }));
  }

  function addHighlight() {
    setValues((v) => (v.highlights.length >= 6 ? v : { ...v, highlights: [...v.highlights, ""] }));
  }

  function removeHighlight(index: number) {
    setValues((v) => ({
      ...v,
      highlights: v.highlights.length <= 1 ? v.highlights : v.highlights.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...values,
        slug: values.slug.trim().toLowerCase(),
        highlights: values.highlights.map((h) => h.trim()).filter((h) => h.length > 0),
      };

      const url = mode === "create" ? "/api/admin/productos" : `/api/admin/productos/${productId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos guardar el producto.");
        return;
      }

      router.push("/admin/productos");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field label="Slug (URL pública, no se puede cambiar)">
        <input
          value={values.slug}
          onChange={(e) => update("slug", e.target.value.toLowerCase())}
          placeholder="ghk-cu"
          required
          disabled={mode === "edit"}
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
        {mode === "edit" && (
          <p className="mt-1 text-xs text-muted">
            El slug no se puede cambiar: es la dirección pública del producto.
          </p>
        )}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <input
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Dosis">
          <input
            value={values.dose}
            onChange={(e) => update("dose", e.target.value)}
            placeholder="10 MG"
            required
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Precio (Bs. 0 = a consultar)">
          <input
            type="number"
            value={values.price}
            onChange={(e) => update("price", Number(e.target.value))}
            min={0}
            step="0.01"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Categoría">
          <select
            value={values.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            required
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Pureza">
          <input
            value={values.purity}
            onChange={(e) => update("purity", e.target.value)}
            placeholder="≥99% HPLC"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Forma">
          <input
            value={values.form}
            onChange={(e) => update("form", e.target.value)}
            placeholder="Liofilizado"
            required
            className={inputClass}
          />
        </Field>
      </div>

      <ImageUploadField
        label="Imagen"
        kind="imagen"
        slug={values.slug}
        value={values.image}
        onChange={(v) => update("image", v)}
      />

      <ImageUploadField
        label="COA (opcional)"
        kind="coa"
        slug={values.slug}
        value={values.coaUrl ?? ""}
        onChange={(v) => update("coaUrl", v.length > 0 ? v : undefined)}
      />

      <Field label="Descripción (opcional)">
        <textarea
          value={values.description ?? ""}
          onChange={(e) => update("description", e.target.value.length > 0 ? e.target.value : undefined)}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Beneficios (1 a 6)</span>
        <div className="space-y-2">
          {values.highlights.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input value={h} onChange={(e) => updateHighlight(i, e.target.value)} className={inputClass} />
              {values.highlights.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeHighlight(i)}
                  className="focus-ring shrink-0 rounded-lg border border-border px-3 text-xs text-muted transition hover:text-danger"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
        {values.highlights.length < 6 && (
          <button
            type="button"
            onClick={addHighlight}
            className="focus-ring mt-2 rounded text-xs text-accent-light hover:underline"
          >
            + Agregar beneficio
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => update("featured", e.target.checked)}
            className="focus-ring h-4 w-4 rounded border-border"
          />
          Destacado (home)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isNew}
            onChange={(e) => update("isNew", e.target.checked)}
            className="focus-ring h-4 w-4 rounded border-border"
          />
          Nuevo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.trackStock}
            onChange={(e) => update("trackStock", e.target.checked)}
            className="focus-ring h-4 w-4 rounded border-border"
          />
          Controlar stock
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Guardando…" : mode === "create" ? "Crear producto" : "Guardar cambios"}
      </button>
    </form>
  );
}

const inputClass =
  "focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
