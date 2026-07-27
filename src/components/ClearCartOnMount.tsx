"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/**
 * Vacía el carrito al llegar a la página del pedido — nunca en /checkout
 * antes de que el POST responda, para no dejar al comprador sin carrito si
 * la creación del pedido falla.
 */
export function ClearCartOnMount() {
  useEffect(() => {
    useCart.getState().clear();
  }, []);

  return null;
}
