"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart, cartTotal, resolveCartItems } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { buildOrderWhatsAppUrl } from "@/lib/whatsapp";
import { QtyStepper } from "@/components/CartDrawer";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";
import { CustomerFields, LOCAL_DELIVERY_CITY } from "@/components/CustomerFields";
import { useDiscountField } from "@/lib/use-discount-field";
import { useCatalog } from "@/components/CatalogProvider";

export default function CarritoPage() {
  const {
    items,
    setQuantity,
    removeItem,
    clear,
    customerName,
    setCustomerName,
    customerCity,
    setCustomerCity,
    customerWantsDelivery,
    setCustomerWantsDelivery,
    customerAddress,
    setCustomerAddress,
  } = useCart();
  const catalog = useCatalog();
  const resolvedItems = resolveCartItems(items, catalog);
  const total = cartTotal(resolvedItems);
  // La línea "Dirección" del mensaje solo existe para Cochabamba con envío a
  // domicilio elegido — ver el comentario en OrderMessageDetails (whatsapp.ts).
  const messageAddress =
    customerCity === LOCAL_DELIVERY_CITY && customerWantsDelivery ? customerAddress : undefined;

  // El auto-apply de `?codigo=` lo hace CartDrawer (siempre montado en el
  // layout, ver use-discount-field.ts): acá solo se lee/edita el estado
  // compartido del store.
  const {
    discountInput,
    setDiscountInput,
    discountState,
    discountMessage,
    discountAnnounceKey,
    appliedDiscount,
    applyDiscountCode,
    removeDiscount,
  } = useDiscountField(resolvedItems);

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

              <div className="mt-4 border-t border-border pt-4">
                <p className="eyebrow mb-2">Tus datos</p>
                <CustomerFields
                  name={customerName}
                  onNameChange={setCustomerName}
                  city={customerCity}
                  onCityChange={setCustomerCity}
                  wantsDelivery={customerWantsDelivery}
                  onWantsDeliveryChange={setCustomerWantsDelivery}
                  address={customerAddress}
                  onAddressChange={setCustomerAddress}
                />
              </div>

              <div className="mt-4 border-t border-border pt-4">
                {appliedDiscount ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
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
                  <div className="flex gap-2">
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
                      className={`focus-ring w-full rounded-lg border bg-surface-2 px-4 py-3 text-sm outline-none transition ${
                        discountState === "error" ? "border-danger" : "border-border"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => applyDiscountCode(discountInput)}
                      disabled={discountState === "validating" || discountInput.trim().length === 0}
                      className="focus-ring shrink-0 rounded-lg border border-border px-4 py-3 text-sm font-medium transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {discountState === "validating" ? "…" : "Aplicar"}
                    </button>
                  </div>
                )}
                <p
                  role="status"
                  aria-live="polite"
                  key={discountAnnounceKey}
                  className="mt-1.5 min-h-4 text-xs"
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
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                No hay pago en línea. Coordinás por WhatsApp los datos de
                entrega, el método de pago y el costo de envío.{" "}
                <Link href="/envios" className="focus-ring rounded text-accent-light hover:underline">
                  Ver cobertura y tiempos de envío
                </Link>
                .
              </p>
              <div className="mt-5">
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
