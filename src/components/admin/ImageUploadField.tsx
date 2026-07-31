"use client";

import { useState, type ChangeEvent } from "react";

type Props = {
  label: string;
  kind: "imagen" | "coa";
  slug: string;
  value: string;
  onChange: (value: string) => void;
};

/**
 * Sube a Supabase Storage (bucket `catalogo`) vía /api/admin/productos/subir.
 * También acepta pegar una ruta a mano — los 10 productos existentes apuntan
 * a /public y tienen que poder seguir así (§4 del plan).
 */
export function ImageUploadField({ label, kind, slug, value, onChange }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;

    if (!slug.trim()) {
      setError("Escribí el slug del producto antes de subir un archivo.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      formData.append("slug", slug.trim());

      const res = await fetch("/api/admin/productos/subir", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos subir el archivo.");
        return;
      }
      const body = (await res.json()) as { url: string };
      onChange(body.url);
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {kind === "imagen" && value && (
        // Preview simple: la ruta puede ser /public local o una URL absoluta
        // de Storage — next/image exige un host permitido para lo segundo,
        // acá no importa optimizarla, solo mostrarla mientras se edita.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Vista previa"
          className="mb-2 h-24 w-24 rounded-lg border border-border object-cover"
        />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={kind === "imagen" ? "/products/x.webp o URL" : "URL del COA (opcional)"}
          className="focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition"
        />
        <label className="focus-ring flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium transition hover:bg-surface-2">
          {isUploading ? "Subiendo…" : "Subir archivo"}
          <input
            type="file"
            accept={kind === "imagen" ? "image/webp,image/jpeg,image/png" : "application/pdf"}
            onChange={handleFile}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
