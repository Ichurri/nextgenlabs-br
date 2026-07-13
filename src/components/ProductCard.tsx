"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/data/products";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppUrl } from "@/config/site";

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5">
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-black"
      >
        <Image
          src={product.image}
          alt={`Vial de ${product.name} ${product.dose}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-md bg-accent/90 px-2 py-1 text-[11px] font-bold tracking-wide text-white">
          {product.dose}
        </span>
        <span className="absolute right-3 top-3 rounded-md border border-white/20 bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {product.purity}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <span className="eyebrow mb-1 text-[10px]">{product.category}</span>
        <Link href={`/producto/${product.slug}`}>
          <h3 className="text-base font-semibold leading-tight transition hover:text-accent-light">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted">
          Solo para uso de investigación
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          {product.price > 0 ? (
            <>
              <span className="text-lg font-bold">{formatPrice(product.price)}</span>
              <button
                onClick={() => addItem(product)}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-light"
              >
                Añadir
              </button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-muted">A consultar</span>
              <a
                href={buildWhatsAppUrl(
                  `Hola Nextgen Labs, quiero consultar el precio de ${product.name} ${product.dose}.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-light"
              >
                Consultar
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
