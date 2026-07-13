"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart, cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { buildOrderWhatsAppUrl } from "@/lib/whatsapp";
import { QtyStepper } from "@/components/CartDrawer";

export default function CarritoPage() {
  const { items, setQuantity, removeItem, clear } = useCart();
  const total = cartTotal(items);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">
        Tu carrito
      </h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-muted">Tu carrito está vacío.</p>
          <Link
            href="/catalogo"
            className="mt-5 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Ítems */}
          <div className="lg:col-span-2">
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {items.map((item) => (
                <li key={item.slug} className="flex gap-4 p-4">
                  <Link
                    href={`/producto/${item.slug}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-black"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/producto/${item.slug}`}
                          className="font-semibold transition hover:text-accent-light"
                        >
                          {item.name}
                        </Link>
                        <p className="text-sm text-muted">{item.dose}</p>
                      </div>
                      <span className="font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QtyStepper
                        value={item.quantity}
                        onChange={(q) => setQuantity(item.slug, q)}
                      />
                      <button
                        onClick={() => removeItem(item.slug)}
                        className="text-sm text-muted transition hover:text-red-400"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={clear}
              className="mt-4 text-sm text-muted transition hover:text-foreground"
            >
              Vaciar carrito
            </button>
          </div>

          {/* Resumen */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">Resumen del pedido</h2>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                No hay pago en línea. Al finalizar, se abrirá WhatsApp con el
                detalle de tu pedido para coordinar el pago y la entrega.
              </p>
              <a
                href={buildOrderWhatsAppUrl(items)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#20bd5a]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>
                Finalizar pedido por WhatsApp
              </a>
              <Link
                href="/catalogo"
                className="mt-3 block text-center text-sm text-muted transition hover:text-foreground"
              >
                Seguir viendo productos
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
