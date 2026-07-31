"use client";

import { useState, type FormEvent } from "react";
import { parseOrderMessage } from "@/lib/whatsapp-parse";
import { ReceiptItemsEditor, type ReceiptItem } from "@/components/admin/ReceiptItemsEditor";
import {
  ReceiptCustomerFields,
  type ReceiptCustomerForm,
} from "@/components/admin/ReceiptCustomerFields";
import type { Product } from "@/lib/products.types";

const emptyForm: ReceiptCustomerForm = { name: "", phone: "", city: "", address: "", note: "" };

/** Extrae el filename de un header Content-Disposition: attachment; filename="X.pdf". */
function filenameFromContentDisposition(header: string | null): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "Comprobante.pdf";
}

export function ReceiptBuilderForm({ products }: { products: Product[] }) {
  const [rawMessage, setRawMessage] = useState("");
  const [parsed, setParsed] = useState(false);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [form, setForm] = useState<ReceiptCustomerForm>(emptyForm);
  const [discountCode, setDiscountCode] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockBatchId, setStockBatchId] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState(false);
  const [undoState, setUndoState] = useState<"idle" | "pending" | "done" | "error">("idle");

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

  async function undoStockBatch() {
    if (!stockBatchId) return;
    setUndoState("pending");
    try {
      const res = await fetch(`/api/admin/stock/${stockBatchId}`, { method: "DELETE" });
      setUndoState(res.ok ? "done" : "error");
    } catch {
      setUndoState("error");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setStockBatchId(null);
    setStockWarning(false);
    setUndoState("idle");

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
      isPaid,
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

      if (res.headers.get("X-Stock-Warning")) {
        setStockWarning(true);
      } else {
        setStockBatchId(res.headers.get("X-Stock-Batch-Id"));
      }

      const blob = await res.blob();
      const filename = filenameFromContentDisposition(res.headers.get("Content-Disposition"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
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
            placeholder={"Hola Nextgen Labs, quiero hacer un pedido:\n\n• Producto Dosis xN — Bs …"}
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
        isPaid={isPaid}
        onIsPaidChange={setIsPaid}
      />

      {submitError && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || items.length === 0}
        className="focus-ring w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Generando…" : "Generar comprobante"}
      </button>

      {stockWarning && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          El comprobante se generó, pero no pudimos descontar el stock automáticamente. Ajustalo
          a mano desde la ficha del producto.
        </p>
      )}

      {stockBatchId && undoState !== "done" && (
        <p className="text-xs text-muted">
          ¿Generaste este comprobante dos veces?{" "}
          <button
            type="button"
            onClick={undoStockBatch}
            disabled={undoState === "pending"}
            className="focus-ring rounded text-accent-light hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {undoState === "pending" ? "Deshaciendo…" : "Deshacer el descuento de stock"}
          </button>
          {undoState === "error" && (
            <span className="ml-1 text-danger">No pudimos deshacerlo, probá de nuevo.</span>
          )}
        </p>
      )}
      {undoState === "done" && (
        <p className="text-xs text-success">Descuento de stock deshecho.</p>
      )}
    </form>
  );
}

const inputClass =
  "focus-ring w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition";
