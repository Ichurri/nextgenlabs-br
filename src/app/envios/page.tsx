import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";
import { buildWhatsAppUrl } from "@/config/site";

export const metadata: Metadata = { title: "Frete", description: "Informações de frete da Nextgen Labs Brasil." };

export default function EnviosPage() {
  return <>
    <LegalPage eyebrow="Frete" title="Entrega e atendimento" updated="setembro de 2026" sections={[
      { heading: "Origem", body: ["O atendimento da loja brasileira é feito a partir de São Paulo."] },
      { heading: "Valor do frete", body: ["O carrinho calcula R$ 35 de frete por pedido. O valor final e a disponibilidade para o destino informado são confirmados no atendimento por WhatsApp."] },
      { heading: "Prazo e endereço", body: ["Informe sua cidade e, se desejar, seu endereço no carrinho. O prazo de entrega e os detalhes do envio serão confirmados antes da conclusão do pedido."] },
      { heading: "Pagamento", body: ["O site não processa pagamentos online. O método de pagamento é combinado diretamente pelo WhatsApp."] },
    ]} />
    <div className="mx-auto -mt-6 max-w-3xl px-4 pb-14 sm:px-6">
      <WhatsAppCtaButton href={buildWhatsAppUrl("Olá Nextgen Labs, gostaria de consultar o frete.")} label="Consultar frete pelo WhatsApp" variant="solid" fullWidth={false} analyticsEvent="whatsapp_click_contact" />
    </div>
  </>;
}
