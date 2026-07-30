import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * No hay cuenta ni correo: el token es la única llave del comprador a su
 * pedido. Si cierra la pestaña antes de guardar el link, lo pierde para
 * siempre. Esto guarda un rastro discreto en localStorage — sin datos
 * personales, solo lo necesario para volver a encontrar el pedido.
 */
export type RecentOrder = {
  token: string;
  orderNumber: string;
  createdAt: string; // ISO
};

const MAX_RECENT_ORDERS = 10;

type RecentOrdersState = {
  orders: RecentOrder[];
  addOrder: (order: RecentOrder) => void;
};

export const useRecentOrders = create<RecentOrdersState>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders.filter((o) => o.token !== order.token)].slice(
            0,
            MAX_RECENT_ORDERS
          ),
        })),
    }),
    { name: "nextgen-recent-orders" }
  )
);
