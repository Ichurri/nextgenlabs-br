"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import { checkoutSchema } from "@/lib/orders.schema";
import { normalizeCode } from "@/lib/discounts";
import { SHIPPING } from "@/config/shipping";
import { buildWhatsAppUrl, siteConfig } from "@/config/site";

type FormState = {
  name: string;
  phone: string;
  city: string;
  address: string;
  note: string;
};

const emptyForm: FormState = { name: "", phone: "", city: "", address: "", note: "" };

type AppliedDiscount = { code: string; amount: number; label: string };
type DiscountFieldState = "idle" | "validating" | "applied" | "error";

export function CheckoutForm() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const pendingCode = useCart((s) => s.pendingCode);
  const clearPendingCode = useCart((s) => s.clearPendingCode);
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [discountInput, setDiscountInput] = useState("");
  const [discountState, setDiscountState] = useState<DiscountFieldState>("idle");
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountAnnounceKey, setDiscountAnnounceKey] = useState(0);

  // El carrito persiste en localStorage y se rehidrata después del primer
  // render: hay que esperar esa rehidratación antes de decidir si el
  // carrito está realmente vacío, o el checkout redirige de más al recargar
  // la página con un carrito lleno.
  useEffect(() => {
    if (useCart.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCart.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && items.length === 0) router.replace("/catalogo");
  }, [hydrated, items.length, router]);

  const sellableItems = items.filter((i) => i.price > 0);

  // Link con código pre-aplicado (?codigo=MAFE10 en /catalogo): se valida
  // una sola vez al montar, silenciosamente si falla — no es el comprador
  // quien lo escribió, así que un error agresivo acá sería confuso.
  const autoApplyRan = useRef(false);
  useEffect(() => {
    if (!hydrated || autoApplyRan.current || !pendingCode || sellableItems.length === 0) return;
    autoApplyRan.current = true;
    const code = pendingCode;
    clearPendingCode();
    setDiscountInput(code);
    void applyDiscountCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corre una sola vez al hidratar, ver autoApplyRan
  }, [hydrated, pendingCode, sellableItems.length]);

  if (!hydrated || items.length === 0) return null;

  const consultaItems = items.filter((i) => i.price === 0);

  const subtotal = cartTotal(sellableItems);
  const discountAmount = appliedDiscount?.amount ?? 0;
  const subtotalAfterDiscount = round2(subtotal - discountAmount);
  const freeShipping = SHIPPING.freeOver !== null && subtotalAfterDiscount >= SHIPPING.freeOver;
  const shipping = sellableItems.length > 0 && !freeShipping ? SHIPPING.nationalCost : 0;
  const total = round2(subtotalAfterDiscount + shipping);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function applyDiscountCode(rawCode: string) {
    const code = normalizeCode(rawCode);
    if (!code) return;

    setDiscountState("validating");
    setDiscountMessage(null);

    try {
      const res = await fetch("/api/descuentos/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: sellableItems.map((i) => ({ slug: i.slug, quantity: i.quantity })),
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok || !body || body.valid !== true) {
        setAppliedDiscount(null);
        setDiscountState("error");
        setDiscountMessage(body?.message ?? "No pudimos validar el código. Probá de nuevo.");
        setDiscountAnnounceKey((k) => k + 1);
        return;
      }

      setAppliedDiscount({ code: body.code, amount: body.amount, label: body.label });
      setDiscountState("applied");
      setDiscountMessage(null);
      setDiscountAnnounceKey((k) => k + 1);
    } catch {
      setAppliedDiscount(null);
      setDiscountState("error");
      setDiscountMessage("No pudimos conectar con el servidor. Probá de nuevo.");
      setDiscountAnnounceKey((k) => k + 1);
    }
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountState("idle");
    setDiscountMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      items: sellableItems.map((i) => ({ slug: i.slug, quantity: i.quantity })),
      customer: {
        name: form.name,
        phone: form.phone,
        city: form.city,
        address: form.address,
        note: form.note,
      },
      ...(appliedDiscount ? { discountCode: appliedDiscount.code } : {}),
    };

    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[issue.path.length - 1];
        if (typeof key === "string" && key in emptyForm) {
          fieldErrors[key as keyof FormState] = issue.message;
        }
      }
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) {
        setSubmitError(parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.");
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        // 409 = el código dejó de ser válido entre que se aplicó y se
        // confirmó (venció, se agotó...). Se quita del resumen y el
        // comprador tiene que confirmar de nuevo con el total real: nunca
        // se le cobra más de lo que vio sin que lo apruebe explícitamente.
        if (res.status === 409 && appliedDiscount) {
          setAppliedDiscount(null);
          setDiscountState("error");
          setDiscountMessage(errorBody?.error ?? "Ese código dejó de ser válido.");
          setDiscountAnnounceKey((k) => k + 1);
          setSubmitError(
            "Tu código de descuento dejó de ser válido y lo quitamos del pedido. Revisá el nuevo total y confirmá de nuevo."
          );
          return;
        }
        setSubmitError(errorBody?.error ?? "No pudimos registrar el pedido. Probá de nuevo.");
        return;
      }

      const { token } = (await res.json()) as { token: string };
      router.push(`/pedido/${token}`);
    } catch {
      setSubmitError(
        "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <form onSubmit={handleSubmit} noValidate className="space-y-5 lg:col-span-2">
        {consultaItems.length > 0 && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-muted">
            {consultaItems.map((i) => i.name).join(", ")} — precio a consultar, no{" "}
            {consultaItems.length === 1 ? "entra" : "entran"} en este pedido.{" "}
            <a
              href={buildWhatsAppUrl(
                `Hola ${siteConfig.name}, quiero consultar el precio de ${consultaItems
                  .map((i) => `${i.name} ${i.dose}`)
                  .join(", ")}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded font-semibold text-accent-light hover:underline"
            >
              Consultalo por WhatsApp
            </a>
            .
          </div>
        )}

        {sellableItems.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
            Todos los productos de tu carrito son &ldquo;precio a consultar&rdquo;. Coordiná por
            WhatsApp para continuar.
          </div>
        ) : (
          <>
            <Field label="Nombre completo" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                autoComplete="name"
                className={inputClass(!!errors.name)}
              />
            </Field>
            <Field label="WhatsApp" error={errors.phone}>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="69437674"
                className={inputClass(!!errors.phone)}
              />
            </Field>
            <Field label="Ciudad" error={errors.city}>
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                autoComplete="address-level2"
                className={inputClass(!!errors.city)}
              />
            </Field>
            <Field label="Dirección o referencia (opcional)" error={errors.address}>
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                autoComplete="street-address"
                className={inputClass(!!errors.address)}
              />
            </Field>
            <Field label="Nota (opcional)" error={errors.note}>
              <textarea
                value={form.note}
                onChange={(e) => updateField("note", e.target.value)}
                rows={3}
                className={inputClass(!!errors.note)}
              />
            </Field>

            {submitError && (
              <p
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Registrando pedido…" : "Confirmar pedido"}
            </button>
          </>
        )}
      </form>

      <aside className="lg:col-span-1">
        <div className="sticky top-24 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Resumen del pedido</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {sellableItems.map((item) => (
              <li key={item.slug} className="flex justify-between gap-2">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span className="text-foreground">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          {sellableItems.length > 0 && (
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
                    className={inputClass(discountState === "error")}
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
              {/* aria-live: mismo patrón que CartToast.tsx — key fuerza el
                  remount para que un lector de pantalla vuelva a anunciarlo
                  aunque el mensaje se repita. */}
              <p role="status" aria-live="polite" className="mt-1.5 min-h-4 text-xs" key={discountAnnounceKey}>
                {discountState === "error" && discountMessage && (
                  <span className="text-danger">{discountMessage}</span>
                )}
                {discountState === "applied" && (
                  <span className="text-accent-light">Código aplicado.</span>
                )}
              </p>
            </div>
          )}

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between">
                <span className="text-muted">Descuento</span>
                <span className="text-accent-light">−{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">{SHIPPING.label}</span>
              <span>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Link
            href="/carrito"
            className="focus-ring mt-4 block rounded text-center text-xs text-muted transition hover:text-foreground"
          >
            Volver al carrito
          </Link>
        </div>
      </aside>
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return `focus-ring w-full rounded-lg border bg-surface-2 px-4 py-3 text-sm outline-none transition ${
    hasError ? "border-danger" : "border-border"
  }`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
