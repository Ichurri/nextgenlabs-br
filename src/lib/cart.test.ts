import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCart, cartCount, cartTotal, resolveCartItems, type CartItem } from "@/lib/cart";
import type { Product } from "@/data/products";

vi.mock("@/data/products", () => {
  const products = [
    {
      slug: "vigente",
      name: "Nombre actual",
      dose: "20 MG",
      price: 999,
      image: "/vigente.webp",
      inStock: true,
    },
    {
      slug: "agotado",
      name: "Producto agotado",
      dose: "10 MG",
      price: 500,
      image: "/agotado.webp",
      inStock: false,
    },
  ];
  return {
    getProductBySlug: (slug: string) => products.find((p) => p.slug === slug),
    isInStock: (product: { inStock?: boolean }) => product.inStock !== false,
  };
});

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
  useCart.setState({
    items: [],
    isDrawerOpen: false,
    lastAddedName: null,
    addNonce: 0,
    pendingCode: null,
    appliedCode: null,
    customerName: "",
    customerCity: "",
  });
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

  it("clear vacía el carrito y el código de descuento aplicado", () => {
    useCart.getState().addItem(makeProduct());
    useCart.getState().setAppliedCode({ code: "MAFE10", amount: 10, label: "10% de descuento" });
    useCart.getState().clear();

    expect(useCart.getState().items).toHaveLength(0);
    expect(useCart.getState().appliedCode).toBeNull();
  });

  it("openDrawer y closeDrawer alternan isDrawerOpen", () => {
    useCart.getState().openDrawer();
    expect(useCart.getState().isDrawerOpen).toBe(true);

    useCart.getState().closeDrawer();
    expect(useCart.getState().isDrawerOpen).toBe(false);
  });

  it("setAppliedCode guarda el código de descuento aplicado", () => {
    useCart.getState().setAppliedCode({ code: "MAFE10", amount: 10, label: "10% de descuento" });
    expect(useCart.getState().appliedCode).toEqual({
      code: "MAFE10",
      amount: 10,
      label: "10% de descuento",
    });
  });

  it("clearAppliedCode borra el código de descuento aplicado", () => {
    useCart.getState().setAppliedCode({ code: "MAFE10", amount: 10, label: "10% de descuento" });
    useCart.getState().clearAppliedCode();
    expect(useCart.getState().appliedCode).toBeNull();
  });

  it("setCustomerName y setCustomerCity guardan los datos del comprador", () => {
    useCart.getState().setCustomerName("Juan Pérez");
    useCart.getState().setCustomerCity("La Paz");

    const { customerName, customerCity } = useCart.getState();
    expect(customerName).toBe("Juan Pérez");
    expect(customerCity).toBe("La Paz");
  });

  it("clear NO borra nombre y ciudad: identifican a la persona, no al pedido", () => {
    useCart.getState().addItem(makeProduct());
    useCart.getState().setCustomerName("Juan Pérez");
    useCart.getState().setCustomerCity("La Paz");
    useCart.getState().clear();

    expect(useCart.getState().items).toHaveLength(0);
    expect(useCart.getState().customerName).toBe("Juan Pérez");
    expect(useCart.getState().customerCity).toBe("La Paz");
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

describe("resolveCartItems", () => {
  it("devuelve el precio, nombre y dosis actuales, no el snapshot guardado", () => {
    const stale: CartItem[] = [
      { slug: "vigente", name: "Nombre viejo", dose: "10 MG", price: 100, image: "", quantity: 2 },
    ];
    const resolved = resolveCartItems(stale);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      slug: "vigente",
      name: "Nombre actual",
      dose: "20 MG",
      price: 999,
      quantity: 2,
      inStock: true,
    });
  });

  it("descarta un slug que ya no existe en el catálogo", () => {
    const stale: CartItem[] = [
      { slug: "vigente", name: "X", dose: "1 MG", price: 1, image: "", quantity: 1 },
      { slug: "discontinuado", name: "Y", dose: "1 MG", price: 1, image: "", quantity: 1 },
    ];
    const resolved = resolveCartItems(stale);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].slug).toBe("vigente");
  });

  it("expone inStock: false para un producto agotado", () => {
    const stale: CartItem[] = [
      { slug: "agotado", name: "Y", dose: "1 MG", price: 1, image: "", quantity: 1 },
    ];
    const resolved = resolveCartItems(stale);
    expect(resolved[0].inStock).toBe(false);
  });

  it("devuelve un array vacío para un carrito vacío", () => {
    expect(resolveCartItems([])).toEqual([]);
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
