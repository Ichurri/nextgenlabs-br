"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SortControls } from "@/components/admin/SortControls";
import type { AdminCategory } from "@/lib/products-data";

export function CategoryList({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const active = [...categories].filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const archived = categories.filter((c) => !c.isActive);

  return (
    <div className="space-y-8">
      <NewCategoryForm onCreated={() => router.refresh()} />

      {active.length === 0 ? (
        <p className="text-sm text-muted">Todavía no creaste ninguna categoría.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {active.map((c, i) => (
            <CategoryRow key={c.id} category={c} isFirst={i === 0} isLast={i === active.length - 1} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details>
          <summary className="focus-ring cursor-pointer rounded text-sm font-medium text-muted hover:text-foreground">
            Archivadas ({archived.length})
          </summary>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
            {archived.map((c) => (
              <CategoryRow key={c.id} category={c} isFirst isLast />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function NewCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos crear la categoría.");
        return;
      }
      setName("");
      onCreated();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="min-w-48 flex-1">
        <span className="mb-1.5 block text-sm font-medium">Nueva categoría</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Nootrópicos"
          required
          className="focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition"
        />
      </label>
      <button
        type="submit"
        disabled={pending || name.trim().length === 0}
        className="focus-ring rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear"}
      </button>
      {error && (
        <p role="alert" className="w-full text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function CategoryRow({
  category,
  isFirst,
  isLast,
}: {
  category: AdminCategory;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed === category.name) {
      setIsEditing(false);
      setName(category.name);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categorias/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos renombrar la categoría.");
        return;
      }
      setIsEditing(false);
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  async function toggleArchive() {
    if (category.isActive) {
      const confirmed = window.confirm(
        `Archivar "${category.name}" la saca del filtro del catálogo. Solo se puede archivar si no tiene productos activos.`
      );
      if (!confirmed) return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categorias/${category.id}?accion=archivar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos actualizar la categoría.");
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
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="focus-ring rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none transition"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={pending}
              className="focus-ring rounded text-xs font-medium text-accent-light hover:underline"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setName(category.name);
              }}
              className="focus-ring rounded text-xs text-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold">{category.name}</p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      {!isEditing && category.isActive && (
        <>
          <SortControls
            moveUpUrl={
              isFirst ? null : `/api/admin/categorias/${category.id}?accion=mover&direction=up`
            }
            moveDownUrl={
              isLast ? null : `/api/admin/categorias/${category.id}?accion=mover&direction=down`
            }
          />
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="focus-ring rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2"
          >
            Renombrar
          </button>
        </>
      )}

      <button
        type="button"
        onClick={toggleArchive}
        disabled={pending}
        className="focus-ring rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {category.isActive ? "Archivar" : "Reactivar"}
      </button>
    </li>
  );
}
