"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseOrderMessage } from "@/lib/whatsapp-parse";
import { ReceiptItemsEditor, type ReceiptItem } from "@/components/admin/ReceiptItemsEditor";
import {
  ReceiptCustomerFields,
  type ReceiptCustomerForm,
} from "@/components/admin/ReceiptCustomerFields";
import type { Product } from "@/lib/products.types";

const emptyForm: ReceiptCustomerForm = { name: "", phone: "", city: "", address: "", note: "" };

export function ReceiptBuilderForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [rawMessage, setRawMessage] = useState("");
  const [parsed, setParsed] = useState(false);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [form, setForm] = useState<ReceiptCustomerForm>(emptyForm);
  const [discountCode, setDiscountCode] = useState("");
  const [discountCodeLocked, setDiscountCodeLocked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockWarning, setStockWarning] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  function updateField<K extends keyof ReceiptCustomerForm>(key: K, value: ReceiptCustomerForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleParse() {
    const result = parseOrderMessage(rawMessage, products);
    setItems(result.items);
    setUnmatched(result.unmatched);
    setForm({
      name: result.name ?? "",
      phone: "",
      city: result.city ?? "",
      address: result.address ?? "",
      note: "",
    });
    setDiscountCode(result.code ?? "");
    // Si el código vino del mensaje, no se puede tocar en esta pantalla: así
    // el descuento aplicado siempre traza al que escribió el comprador.
    setDiscountCodeLocked(result.code !== null);
    setSubmitError(null);
    setParsed(true);
  }

  function updateQuantity(slug: string, quantity: number) {
    setItems((prev) =>
      prev.map((i) => (i.slug === slug ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  }

  function removeItem(slug: string) {
    setItems((prev) => prev.filter((i) => i.slug !== slug));
  }

  function addItem(slug: string) {
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === slug);
      if (existing) {
        return prev.map((i) => (i.slug === slug ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { slug, quantity: 1 }];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setStockWarning(false);

    const payload = {
      items: items.map(({ slug, quantity }) => ({ slug, quantity })),
      customer: {
        name: form.name,
        phone: form.phone,
        city: form.city,
        address: form.address,
        note: form.note,
      },
      ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
    };

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/recibos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSubmitError(body?.error ?? "No pudimos generar el comprobante.");
        return;
      }

      const body = (await res.json()) as { orderNumber: string; stockWarning: boolean };

      if (body.stockWarning) {
        // No redirige: el dueño tiene que leer el aviso y corregir el stock a mano.
        setStockWarning(true);
        setCreatedOrderNumber(body.orderNumber);
        return;
      }

      router.push(`/admin?nuevo=${encodeURIComponent(body.orderNumber)}`);
      router.refresh();
    } catch {
      setSubmitError("No pudimos conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!parsed) {
    return (
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Pegá el mensaje de WhatsApp</span>
          <textarea
            value={rawMessage}
            onChange={(e) => setRawMessage(e.target.value)}
            rows={12}
            placeholder={"Olá Nextgen Labs, quero fazer um pedido:\n\n• Producto Dosis xN — R$ …"}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={handleParse}
          disabled={rawMessage.trim().length === 0}
          className="focus-ring rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          Leer mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <button
        type="button"
        onClick={() => setParsed(false)}
        className="focus-ring rounded text-xs text-muted transition hover:text-foreground"
      >
        ← Volver a pegar el mensaje
      </button>

      <ReceiptItemsEditor
        products={products}
        items={items}
        unmatched={unmatched}
        onQuantityChange={updateQuantity}
        onRemove={removeItem}
        onAdd={addItem}
      />

      <ReceiptCustomerFields
        form={form}
        onChange={updateField}
        discountCode={discountCode}
        onDiscountCodeChange={setDiscountCode}
        discountCodeLocked={discountCodeLocked}
      />

      {submitError && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || items.length === 0 || createdOrderNumber !== null}
        className="focus-ring w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Guardando…" : "Guardar pedido y generar comprobante"}
      </button>

      {stockWarning && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <p>
            El pedido {createdOrderNumber} quedó guardado, pero no pudimos descontar el stock.
            Restalo a mano con &ldquo;Ajustar stock&rdquo; en la ficha del producto.
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            <Link href="/admin/productos" className="focus-ring rounded underline">
              Ir a productos
            </Link>
            <Link href="/admin" className="focus-ring rounded underline">
              Ir a pedidos
            </Link>
          </div>
        </div>
      )}
    </form>
  );
}

const inputClass =
  "focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";
