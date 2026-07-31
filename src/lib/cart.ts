import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isInStock, type Catalog, type Product } from "@/lib/products.types";

export type CartItem = {
  slug: string;
  name: string;
  dose: string;
  price: number;
  image: string;
  quantity: number;
};

// Código de descuento ya validado contra /api/descuentos/validar (Fase 9). El
// monto es informativo para el comprador: el que vale es el que el admin
// revalida al generar el comprobante, así que no pasa nada si queda
// desactualizado tras cambiar el carrito.
export type AppliedDiscount = { code: string; amount: number; label: string };

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
  // catálogo y el carrito, no algo que deba sobrevivir a cerrar la pestaña.
  pendingCode: string | null;
  appliedCode: AppliedDiscount | null;
  // Datos del comprador para prellenar el mensaje de WhatsApp (Nombre/Ciudad
  // de "Mis datos"). Nunca se validan ni se mandan a ningún endpoint: si
  // quedan vacíos, buildOrderMessage() cae en las etiquetas en blanco de
  // siempre, para completar a mano dentro de WhatsApp.
  customerName: string;
  customerCity: string;
  // Solo tiene sentido cuando customerCity === "Cochabamba" (ver
  // CustomerFields.tsx): en el resto de las ciudades no se ofrece elegir
  // entre envío a domicilio y recojo, así que estos dos campos quedan sin
  // usar — buildOrderMessage() los ignora salvo en ese caso puntual.
  customerWantsDelivery: boolean;
  customerAddress: string;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setPendingCode: (code: string) => void;
  clearPendingCode: () => void;
  setAppliedCode: (discount: AppliedDiscount) => void;
  clearAppliedCode: () => void;
  setCustomerName: (name: string) => void;
  setCustomerCity: (city: string) => void;
  setCustomerWantsDelivery: (wantsDelivery: boolean) => void;
  setCustomerAddress: (address: string) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isDrawerOpen: false,
      lastAddedName: null,
      addNonce: 0,
      pendingCode: null,
      appliedCode: null,
      customerName: "",
      customerCity: "",
      customerWantsDelivery: false,
      customerAddress: "",

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

      clear: () => set({ items: [], appliedCode: null }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setPendingCode: (code) => set({ pendingCode: code }),
      clearPendingCode: () => set({ pendingCode: null }),
      setAppliedCode: (discount) => set({ appliedCode: discount }),
      clearAppliedCode: () => set({ appliedCode: null }),
      setCustomerName: (name) => set({ customerName: name }),
      setCustomerCity: (city) => set({ customerCity: city }),
      setCustomerWantsDelivery: (wantsDelivery) => set({ customerWantsDelivery: wantsDelivery }),
      setCustomerAddress: (address) => set({ customerAddress: address }),
    }),
    {
      name: "nextgen-cart",
      // Persistimos ítems, código aplicado y datos del comprador — no el
      // estado del drawer ni el pendingCode (puente de una sola pasada, ver
      // arriba). Nombre/ciudad/envío/dirección sobreviven a "Vaciar
      // carrito": identifican a la persona, no al pedido puntual.
      partialize: (state) => ({
        items: state.items,
        appliedCode: state.appliedCode,
        customerName: state.customerName,
        customerCity: state.customerCity,
        customerWantsDelivery: state.customerWantsDelivery,
        customerAddress: state.customerAddress,
      }),
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

export type ResolvedCartItem = CartItem & { inStock: boolean };

/**
 * Resuelve los ítems del carrito contra el catálogo: el `price` (y nombre,
 * dosis, imagen) que devuelve es siempre el actual, no el snapshot que
 * zustand guardó en localStorage cuando se agregó el producto. Descarta los
 * slugs que ya no existen en el catálogo (productos discontinuados). Se usa
 * en todo lugar donde se muestra el carrito — CartDrawer, /carrito,
 * CheckoutForm — para que el total nunca quede desactualizado. El catálogo
 * se lee del CatalogProvider (useCatalog()), nunca se importa acá: este
 * archivo corre en el navegador y no puede tocar supabaseAdmin.
 */
export function resolveCartItems(items: CartItem[], catalog: Catalog): ResolvedCartItem[] {
  return items.reduce<ResolvedCartItem[]>((resolved, item) => {
    const product = catalog.products.find((p) => p.slug === item.slug);
    if (!product) return resolved;
    resolved.push({
      slug: product.slug,
      name: product.name,
      dose: product.dose,
      price: product.price,
      image: product.image,
      quantity: item.quantity,
      inStock: isInStock(product),
    });
    return resolved;
  }, []);
}
