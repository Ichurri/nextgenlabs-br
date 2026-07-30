"use client";

import { useEffect, useRef, useState } from "react";
import { useCart, type ResolvedCartItem } from "@/lib/cart";
import { normalizeCode } from "@/lib/discounts";

export type DiscountFieldState = "idle" | "validating" | "applied" | "error";

// El auto-apply desde `?codigo=` (ver ApplyCodeFromUrl) tiene que correr una
// sola vez por código pendiente, aunque el hook se monte en dos lugares a la
// vez (CartDrawer, siempre montado en el layout, y /carrito). Un ref local no
// alcanza: dos instancias montadas en el mismo commit capturan el mismo
// pendingCode antes de que ninguna lo limpie. Solo CartDrawer pasa
// autoApply=true para que exista un único consumidor.
let autoApplyConsumed = false;

export function useDiscountField(
  sellableItems: ResolvedCartItem[],
  { autoApply = false }: { autoApply?: boolean } = {}
) {
  const pendingCode = useCart((s) => s.pendingCode);
  const clearPendingCode = useCart((s) => s.clearPendingCode);
  const appliedDiscount = useCart((s) => s.appliedCode);
  const setAppliedCode = useCart((s) => s.setAppliedCode);
  const clearAppliedCode = useCart((s) => s.clearAppliedCode);

  const [discountInput, setDiscountInput] = useState("");
  const [discountState, setDiscountState] = useState<DiscountFieldState>(
    appliedDiscount ? "applied" : "idle"
  );
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [discountAnnounceKey, setDiscountAnnounceKey] = useState(0);

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
        clearAppliedCode();
        setDiscountState("error");
        setDiscountMessage(body?.message ?? "No pudimos validar el código. Probá de nuevo.");
        setDiscountAnnounceKey((k) => k + 1);
        return;
      }

      setAppliedCode({ code: body.code, amount: body.amount, label: body.label });
      setDiscountState("applied");
      setDiscountMessage(null);
      setDiscountAnnounceKey((k) => k + 1);
    } catch {
      clearAppliedCode();
      setDiscountState("error");
      setDiscountMessage("No pudimos conectar con el servidor. Probá de nuevo.");
      setDiscountAnnounceKey((k) => k + 1);
    }
  }

  function removeDiscount() {
    clearAppliedCode();
    setDiscountInput("");
    setDiscountState("idle");
    setDiscountMessage(null);
  }

  // Link con código pre-aplicado (?codigo=MAFE10 en /catalogo): se valida una
  // sola vez al montar, silenciosamente si falla — no es el comprador quien
  // lo escribió, así que un error agresivo acá sería confuso.
  const autoApplyRan = useRef(false);
  useEffect(() => {
    if (!autoApply || autoApplyRan.current || autoApplyConsumed) return;
    if (!pendingCode || sellableItems.length === 0) return;
    autoApplyRan.current = true;
    autoApplyConsumed = true;
    const code = pendingCode;
    clearPendingCode();
    setDiscountInput(code);
    void applyDiscountCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corre una sola vez al hidratar, ver autoApplyRan/autoApplyConsumed
  }, [autoApply, pendingCode, sellableItems.length]);

  return {
    discountInput,
    setDiscountInput,
    discountState,
    discountMessage,
    discountAnnounceKey,
    appliedDiscount,
    applyDiscountCode,
    removeDiscount,
  };
}
