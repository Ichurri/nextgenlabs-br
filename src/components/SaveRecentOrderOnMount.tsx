"use client";

import { useEffect } from "react";
import { useRecentOrders } from "@/lib/recent-orders";

/** Guarda el pedido en "Mis pedidos" al llegar a /pedido/[token]. */
export function SaveRecentOrderOnMount({
  token,
  orderNumber,
  createdAt,
}: {
  token: string;
  orderNumber: string;
  createdAt: string;
}) {
  useEffect(() => {
    useRecentOrders.getState().addOrder({ token, orderNumber, createdAt });
  }, [token, orderNumber, createdAt]);

  return null;
}
