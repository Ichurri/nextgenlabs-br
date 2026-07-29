"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/**
 * Guarda un `?codigo=MAFE10` de la URL como pendingCode del carrito, para
 * que el checkout lo precargue y valide al montar. No valida acá — eso
 * pasa una sola vez, en CheckoutForm, contra el carrito real.
 */
export function ApplyCodeFromUrl({ code }: { code: string }) {
  const setPendingCode = useCart((s) => s.setPendingCode);

  useEffect(() => {
    setPendingCode(code);
  }, [code, setPendingCode]);

  return null;
}
