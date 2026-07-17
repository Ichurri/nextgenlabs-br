import { beforeEach, describe, expect, it } from "vitest";
import { useCart, cartCount, cartTotal, type CartItem } from "@/lib/cart";
import type { Product } from "@/data/products";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    slug: "test-product",
    name: "Test Product",
    dose: "10 MG",
    price: 100,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Péptidos",
    image: "/products/test.webp",
    highlights: ["Highlight uno"],
    ...overrides,
  };
}

beforeEach(() => {
  // Merge (no `replace`) para no perder los métodos de acción del store.
  useCart.setState({ items: [], isDrawerOpen: false, lastAddedName: null, addNonce: 0 });
});

describe("useCart", () => {
  it("addItem agrega un producto nuevo con cantidad 1 por defecto", () => {
    const product = makeProduct();
    useCart.getState().addItem(product);

    const { items, lastAddedName, addNonce } = useCart.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ slug: product.slug, name: product.name, quantity: 1 });
    expect(lastAddedName).toBe(product.name);
    expect(addNonce).toBe(1);
  });

  it("addItem respeta la cantidad explícita", () => {
    useCart.getState().addItem(makeProduct(), 4);
    expect(useCart.getState().items[0].quantity).toBe(4);
  });

  it("addItem acumula la cantidad si el producto ya está en el carrito", () => {
    const product = makeProduct();
    useCart.getState().addItem(product, 2);
    useCart.getState().addItem(product, 3);

    const { items, addNonce } = useCart.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
    // addNonce sube en cada adición, incluso repitiendo el mismo producto
    // (permite re-disparar el CartToast).
    expect(addNonce).toBe(2);
  });

  it("addItem mantiene ítems separados para productos distintos", () => {
    useCart.getState().addItem(makeProduct({ slug: "a" }));
    useCart.getState().addItem(makeProduct({ slug: "b" }));

    expect(useCart.getState().items).toHaveLength(2);
  });

  it("removeItem quita el producto por slug sin afectar a los demás", () => {
    useCart.getState().addItem(makeProduct({ slug: "a" }));
    useCart.getState().addItem(makeProduct({ slug: "b" }));
    useCart.getState().removeItem("a");

    const { items } = useCart.getState();
    expect(items).toHaveLength(1);
    expect(items[0].slug).toBe("b");
  });

  it("setQuantity actualiza la cantidad de un ítem existente", () => {
    useCart.getState().addItem(makeProduct());
    useCart.getState().setQuantity("test-product", 7);

    expect(useCart.getState().items[0].quantity).toBe(7);
  });

  it("setQuantity nunca deja la cantidad por debajo de 1", () => {
    useCart.getState().addItem(makeProduct());
    useCart.getState().setQuantity("test-product", 0);

    expect(useCart.getState().items[0].quantity).toBe(1);
  });

  it("clear vacía el carrito", () => {
    useCart.getState().addItem(makeProduct());
    useCart.getState().clear();

    expect(useCart.getState().items).toHaveLength(0);
  });

  it("openDrawer y closeDrawer alternan isDrawerOpen", () => {
    useCart.getState().openDrawer();
    expect(useCart.getState().isDrawerOpen).toBe(true);

    useCart.getState().closeDrawer();
    expect(useCart.getState().isDrawerOpen).toBe(false);
  });
});

describe("cartCount", () => {
  it("suma las cantidades de todos los ítems", () => {
    const items: CartItem[] = [
      { slug: "a", name: "A", dose: "1 MG", price: 10, image: "", quantity: 2 },
      { slug: "b", name: "B", dose: "1 MG", price: 20, image: "", quantity: 3 },
    ];
    expect(cartCount(items)).toBe(5);
  });

  it("devuelve 0 para un carrito vacío", () => {
    expect(cartCount([])).toBe(0);
  });
});

describe("cartTotal", () => {
  it("suma precio x cantidad de todos los ítems", () => {
    const items: CartItem[] = [
      { slug: "a", name: "A", dose: "1 MG", price: 100, image: "", quantity: 2 },
      { slug: "b", name: "B", dose: "1 MG", price: 50, image: "", quantity: 1 },
    ];
    expect(cartTotal(items)).toBe(250);
  });

  it("devuelve 0 para un carrito vacío", () => {
    expect(cartTotal([])).toBe(0);
  });
});
