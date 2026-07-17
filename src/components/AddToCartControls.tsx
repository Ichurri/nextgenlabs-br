"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/data/products";
import { QtyStepper } from "@/components/CartDrawer";

export function AddToCartControls({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem);
  const [qty, setQty] = useState(1);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Cantidad</span>
        <QtyStepper value={qty} onChange={(q) => setQty(Math.max(1, q))} />
      </div>
      <button
        onClick={() => addItem(product, qty)}
        className="focus-ring flex-1 rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light"
      >
        Añadir al carrito
      </button>
    </div>
  );
}
