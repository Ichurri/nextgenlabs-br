import { describe, expect, it } from "vitest";
import { customerSchema } from "@/lib/orders.schema";
import { endOfDayBrazil } from "@/lib/discounts";

describe("dados de pedidos no Brasil", () => {
  it("adiciona o DDI 55 a um celular brasileiro sem DDI", () => {
    const customer = customerSchema.parse({ name: "Ana Silva", phone: "(11) 98765-4321", city: "São Paulo" });
    expect(customer.phone).toBe("5511987654321");
  });

  it("preserva números internacionais escritos com DDI", () => {
    const customer = customerSchema.parse({ name: "Juan Perez", phone: "+591 69437674", city: "São Paulo" });
    expect(customer.phone).toBe("59169437674");
  });

  it("converte o fim do dia de São Paulo para UTC", () => {
    expect(endOfDayBrazil("2026-12-31")).toBe("2027-01-01T02:59:59.000Z");
  });
});
