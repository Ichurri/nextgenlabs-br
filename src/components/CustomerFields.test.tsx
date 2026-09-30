import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerFields } from "@/components/CustomerFields";

describe("dados do cliente brasileiro", () => {
  it("permite informar qualquer cidade e um endereço de entrega", () => {
    const html = renderToStaticMarkup(
      <CustomerFields
        name="Ana"
        onNameChange={() => {}}
        city="Rio de Janeiro"
        onCityChange={() => {}}
        wantsDelivery={false}
        onWantsDeliveryChange={() => {}}
        address="Rua Exemplo, 10"
        onAddressChange={() => {}}
      />
    );
    expect(html).toContain('value="Rio de Janeiro"');
    expect(html).toContain('value="Rua Exemplo, 10"');
    expect(html).toContain("Endereço de entrega");
    expect(html).not.toContain("Cochabamba");
  });
});
