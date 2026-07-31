"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCart, cartTotal, cartCount, resolveCartItems } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { buildOrderWhatsAppUrl } from "@/lib/whatsapp";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";
import { CustomerFields, LOCAL_DELIVERY_CITY } from "@/components/CustomerFields";
import { useDiscountField } from "@/lib/use-discount-field";
import { useCatalog } from "@/components/CatalogProvider";

export function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    setQuantity,
    removeItem,
    customerName,
    setCustomerName,
    customerCity,
    setCustomerCity,
    customerWantsDelivery,
    setCustomerWantsDelivery,
    customerAddress,
    setCustomerAddress,
  } = useCart();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    if (isDrawerOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawerOpen, closeDrawer]);

  const catalog = useCatalog();
  const resolvedItems = resolveCartItems(items, catalog);
  const total = cartTotal(resolvedItems);
  const count = cartCount(resolvedItems);
  // La línea "Dirección" del mensaje solo existe para Cochabamba con envío a
  // domicilio elegido — ver el comentario en OrderMessageDetails (whatsapp.ts).
  const messageAddress =
    customerCity === LOCAL_DELIVERY_CITY && customerWantsDelivery ? customerAddress : undefined;

  // CartDrawer está siempre montado (root layout): es el único consumidor
  // del auto-apply de `?codigo=` para todo el sitio, ver use-discount-field.ts.
  const {
    discountInput,
    setDiscountInput,
    discountState,
    discountMessage,
    discountAnnounceKey,
    appliedDiscount,
    applyDiscountCode,
    removeDiscount,
  } = useDiscountField(resolvedItems, { autoApply: true });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm transition-opacity ${
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
            className="focus-ring rounded-lg p-3 text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {resolvedItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-muted">Tu carrito está vacío.</p>
            <Link
              href="/catalogo"
              onClick={closeDrawer}
              className="focus-ring rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {resolvedItems.map((item) => (
                  <li key={item.slug} className="flex gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2">
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
                          {!item.inStock && (
                            <p className="text-xs font-medium text-danger">Agotado</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.slug)}
                          aria-label={`Quitar ${item.name}`}
                          className="focus-ring rounded p-1 text-muted transition hover:text-danger"
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
              <div className="mb-3">
                <p className="eyebrow mb-1.5 text-[0.65rem]">Tus datos</p>
                <CustomerFields
                  name={customerName}
                  onNameChange={setCustomerName}
                  city={customerCity}
                  onCityChange={setCustomerCity}
                  wantsDelivery={customerWantsDelivery}
                  onWantsDeliveryChange={setCustomerWantsDelivery}
                  address={customerAddress}
                  onAddressChange={setCustomerAddress}
                  compact
                />
              </div>
              {appliedDiscount ? (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
                  <span className="font-medium text-accent-light">
                    {appliedDiscount.code} · −{formatPrice(appliedDiscount.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={removeDiscount}
                    aria-label="Quitar código de descuento"
                    className="focus-ring rounded text-muted transition hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="mb-1.5 flex gap-2">
                  <input
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void applyDiscountCode(discountInput);
                      }
                    }}
                    placeholder="Código de descuento"
                    className={`focus-ring w-full rounded-lg border bg-surface-2 px-3 py-2 text-xs outline-none transition ${
                      discountState === "error" ? "border-danger" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => applyDiscountCode(discountInput)}
                    disabled={discountState === "validating" || discountInput.trim().length === 0}
                    className="focus-ring shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {discountState === "validating" ? "…" : "Aplicar"}
                  </button>
                </div>
              )}
              <p
                role="status"
                aria-live="polite"
                key={discountAnnounceKey}
                className="mb-2 min-h-4 text-xs"
              >
                {discountState === "error" && discountMessage && (
                  <span className="text-danger">{discountMessage}</span>
                )}
                {appliedDiscount && (
                  <span className="text-muted">
                    Monto informativo: el admin lo confirma al generar el comprobante.
                  </span>
                )}
              </p>

              <div className="mb-3 flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <WhatsAppCtaButton
                href={buildOrderWhatsAppUrl(resolvedItems, {
                  discountCode: appliedDiscount?.code,
                  name: customerName,
                  city: customerCity,
                  address: messageAddress,
                })}
                label="Finalizar pedido por WhatsApp"
                variant="solid"
                analyticsEvent="whatsapp_click_checkout"
              />
              <Link
                href="/carrito"
                onClick={closeDrawer}
                className="focus-ring mt-2 block rounded text-center text-xs text-muted transition hover:text-foreground"
              >
                Ver carrito completo
              </Link>
              <Link
                href="/envios"
                onClick={closeDrawer}
                className="focus-ring mt-1 block rounded text-center text-xs text-muted transition hover:text-foreground"
              >
                Cobertura y tiempos de envío
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
        className="focus-ring flex h-11 w-11 items-center justify-center rounded-l-lg text-lg leading-none text-muted transition [touch-action:manipulation] hover:text-foreground active:bg-surface-2"
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
        className="focus-ring flex h-11 w-11 items-center justify-center rounded-r-lg text-lg leading-none text-muted transition [touch-action:manipulation] hover:text-foreground active:bg-surface-2"
      >
        +
      </button>
    </div>
  );
}
