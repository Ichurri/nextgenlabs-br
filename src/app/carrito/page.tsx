"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart, cartTotal, resolveCartItems } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { buildOrderWhatsAppUrl } from "@/lib/whatsapp";
import { QtyStepper } from "@/components/CartDrawer";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";

export default function CarritoPage() {
  const { items, setQuantity, removeItem, clear } = useCart();
  const resolvedItems = resolveCartItems(items);
  const total = cartTotal(resolvedItems);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">
        Tu carrito
      </h1>

      {resolvedItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-muted">Tu carrito está vacío.</p>
          <Link
            href="/catalogo"
            className="focus-ring mt-5 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Ítems */}
          <div className="lg:col-span-2">
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {resolvedItems.map((item) => (
                <li key={item.slug} className="flex gap-4 p-4">
                  <Link
                    href={`/producto/${item.slug}`}
                    className="focus-ring relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2"
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
                          className="focus-ring rounded font-semibold transition hover:text-accent-light"
                        >
                          {item.name}
                        </Link>
                        <p className="text-sm text-muted">{item.dose}</p>
                        {!item.inStock && (
                          <p className="text-sm font-medium text-danger">Agotado</p>
                        )}
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
                        className="focus-ring rounded text-sm text-muted transition hover:text-danger"
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
              className="focus-ring mt-4 rounded text-sm text-muted transition hover:text-foreground"
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
                No hay pago en línea. Al continuar recibís un número de
                pedido y las instrucciones para pagar por QR o
                transferencia.{" "}
                <Link href="/envios" className="focus-ring rounded text-accent-light hover:underline">
                  Ver cobertura y tiempos de envío
                </Link>
                .
              </p>
              <Link
                href="/checkout"
                className="focus-ring mt-5 flex w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
              >
                Continuar al pedido
              </Link>
              <div className="mt-3 flex justify-center">
                <WhatsAppCtaButton
                  href={buildOrderWhatsAppUrl(resolvedItems)}
                  label="Finalizar pedido por WhatsApp"
                  variant="compact"
                  analyticsEvent="whatsapp_click_checkout"
                />
              </div>
              <Link
                href="/catalogo"
                className="focus-ring mt-3 block rounded text-center text-sm text-muted transition hover:text-foreground"
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
