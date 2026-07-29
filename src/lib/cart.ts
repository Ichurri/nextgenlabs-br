import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/data/products";

export type CartItem = {
  slug: string;
  name: string;
  dose: string;
  price: number;
  image: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isDrawerOpen: boolean;
  // Aviso breve ("añadido al carrito"): guardamos el último nombre y un contador
  // que se incrementa en cada adición para poder re-disparar el toast aunque sea
  // el mismo producto.
  lastAddedName: string | null;
  addNonce: number;
  // Código de descuento que llegó por `?codigo=` (Fase 6). Vive solo en
  // memoria, no en localStorage: es un puente de una sola pasada entre el
  // catálogo y el checkout, no algo que deba sobrevivir a cerrar la pestaña.
  pendingCode: string | null;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setPendingCode: (code: string) => void;
  clearPendingCode: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isDrawerOpen: false,
      lastAddedName: null,
      addNonce: 0,
      pendingCode: null,

      // Añadir NO abre el carrito: solo acumula el ítem y dispara un aviso breve.
      // El carrito se abre únicamente cuando el usuario pulsa el ícono del carrito.
      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.slug === product.slug);
          const items = existing
            ? state.items.map((i) =>
                i.slug === product.slug
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              )
            : [
                ...state.items,
                {
                  slug: product.slug,
                  name: product.name,
                  dose: product.dose,
                  price: product.price,
                  image: product.image,
                  quantity,
                },
              ];
          return {
            items,
            lastAddedName: product.name,
            addNonce: state.addNonce + 1,
          };
        }),

      removeItem: (slug) =>
        set((state) => ({
          items: state.items.filter((i) => i.slug !== slug),
        })),

      setQuantity: (slug, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.slug === slug ? { ...i, quantity: Math.max(1, quantity) } : i
            )
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setPendingCode: (code) => set({ pendingCode: code }),
      clearPendingCode: () => set({ pendingCode: null }),
    }),
    {
      name: "nextgen-cart",
      // Solo persistimos los ítems, no el estado del drawer.
      partialize: (state) => ({ items: state.items }),
    }
  )
);

/** Selectores derivados (helpers puros, sin hooks). */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}
