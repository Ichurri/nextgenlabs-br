"use client";

import { useState } from "react";
import type { Product } from "@/lib/products.types";
import { formatPrice } from "@/lib/format";
import { normalizeText } from "@/lib/whatsapp-parse";
import { QtyStepper } from "@/components/CartDrawer";

export type ReceiptItem = { slug: string; quantity: number };

type Props = {
  products: Product[];
  items: ReceiptItem[];
  unmatched: string[];
  onQuantityChange: (slug: string, quantity: number) => void;
  onRemove: (slug: string) => void;
  onAdd: (slug: string) => void;
};

/** Ítems reconocidos del mensaje + buscador para agregar los que faltaron. */
export function ReceiptItemsEditor({
  products,
  items,
  unmatched,
  onQuantityChange,
  onRemove,
  onAdd,
}: Props) {
  const [search, setSearch] = useState("");

  const matches =
    search.trim().length === 0
      ? []
      : products
          .filter((p) => normalizeText(`${p.name} ${p.dose}`).includes(normalizeText(search)))
          .slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm font-medium">Ítems</span>
        {items.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
            No hay ítems todavía. Buscá un producto abajo para agregarlo.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((item) => {
              const product = products.find((p) => p.slug === item.slug);
              return (
                <li key={item.slug} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product?.name ?? item.slug}</p>
                    {product && (
                      <p className="text-xs text-muted">
                        {product.dose} · {formatPrice(product.price)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <QtyStepper
                      value={item.quantity}
                      onChange={(q) => onQuantityChange(item.slug, q)}
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(item.slug)}
                      className="focus-ring rounded text-xs text-muted transition hover:text-danger"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Agregar producto</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            className="focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition"
          />
        </label>
        {matches.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {matches.map((product) => (
              <li key={product.slug}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(product.slug);
                    setSearch("");
                  }}
                  className="focus-ring flex w-full items-center justify-between rounded-lg border border-border px-4 py-2.5 text-left text-sm transition hover:bg-surface-2"
                >
                  <span>
                    {product.name} {product.dose}
                  </span>
                  <span className="text-muted">{formatPrice(product.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {unmatched.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <p className="font-medium">
            {unmatched.length === 1
              ? "Esta línea no matcheó ningún producto:"
              : "Estas líneas no matchearon ningún producto:"}
          </p>
          <ul className="mt-1.5 space-y-1 font-mono text-xs">
            {unmatched.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="mt-1.5">Agregalos a mano con el buscador de arriba.</p>
        </div>
      )}
    </div>
  );
}
