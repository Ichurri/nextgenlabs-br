import { describe, expect, it } from "vitest";
import { formatBrazilDate, formatPrice, formatRelativeDays } from "@/lib/format";

describe("formatação brasileira", () => {
  it("mostra valores em reais com duas casas decimais", () => {
    expect(formatPrice(1200).replace(/\s/g, " ")).toBe("R$ 1.200,00");
    expect(formatPrice(950.5).replace(/\s/g, " ")).toBe("R$ 950,50");
  });

  it("usa o dia civil de São Paulo", () => {
    expect(formatBrazilDate("2026-07-30T02:30:00Z")).toBe("29/07/2026");
  });

  it("descreve dias relativos em português", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(formatRelativeDays("2026-09-30T01:00:00Z", now)).toBe("hoje");
    expect(formatRelativeDays("2026-09-29T01:00:00Z", now)).toBe("ontem");
    expect(formatRelativeDays("2026-09-27T01:00:00Z", now)).toBe("há 3 dias");
  });
});
