"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCart, cartTotal, cartCount } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { buildOrderWhatsAppUrl } from "@/lib/whatsapp";

export function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, setQuantity, removeItem } = useCart();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    if (isDrawerOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawerOpen, closeDrawer]);

  const total = cartTotal(items);
  const count = cartCount(items);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity ${
          isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className={`fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            Tu carrito {count > 0 && <span className="text-muted">({count})</span>}
          </h2>
          <button
            onClick={closeDrawer}
            aria-label="Cerrar carrito"
            className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-muted">Tu carrito está vacío.</p>
            <Link
              href="/catalogo"
              onClick={closeDrawer}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.slug} className="flex gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-black">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold leading-tight">{item.name}</p>
                          <p className="text-xs text-muted">{item.dose}</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.slug)}
                          aria-label={`Quitar ${item.name}`}
                          className="text-muted transition hover:text-red-400"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <QtyStepper
                          value={item.quantity}
                          onChange={(q) => setQuantity(item.slug, q)}
                        />
                        <span className="text-sm font-semibold">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <a
                href={buildOrderWhatsAppUrl(items)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#20bd5a]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>
                Finalizar pedido por WhatsApp
              </a>
              <Link
                href="/carrito"
                onClick={closeDrawer}
                className="mt-2 block text-center text-xs text-muted transition hover:text-foreground"
              >
                Ver carrito completo
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="flex select-none items-center rounded-lg border border-border">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label="Disminuir cantidad"
        className="flex h-10 w-10 items-center justify-center text-lg leading-none text-muted transition [touch-action:manipulation] hover:text-foreground active:bg-surface-2"
      >
        −
      </button>
      <span className="min-w-7 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar cantidad"
        className="flex h-10 w-10 items-center justify-center text-lg leading-none text-muted transition [touch-action:manipulation] hover:text-foreground active:bg-surface-2"
      >
        +
      </button>
    </div>
  );
}
