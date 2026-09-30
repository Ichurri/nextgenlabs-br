import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Termos e condições", description: "Termos de uso da Nextgen Labs Brasil." };

// Texto inicial: revisar com assessoria jurídica brasileira antes da publicação.
export default function TerminosPage() {
  return <LegalPage eyebrow="Legal" title="Termos e condições" updated="setembro de 2026" sections={[
    { heading: "1. Finalidade dos produtos", body: ["Os produtos apresentados neste site são destinados exclusivamente à pesquisa laboratorial. Não são destinados ao consumo humano ou animal nem ao uso diagnóstico, terapêutico ou cosmético."] },
    { heading: "2. Pedidos e pagamento", body: ["Os pedidos são iniciados pelo WhatsApp e confirmados no atendimento. Este site não processa pagamentos online. O método de pagamento e a entrega são combinados diretamente com a Nextgen Labs.", "Os preços exibidos estão em reais (BRL). O carrinho calcula R$ 35 de frete por pedido; confirme as condições para o seu destino antes de concluir a compra."] },
    { heading: "3. Disponibilidade", body: ["A disponibilidade dos produtos e o prazo de entrega são confirmados durante o atendimento pelo WhatsApp."] },
    { heading: "4. Contato", body: [`Para dúvidas sobre estes termos, escreva para ${siteConfig.contact.email}.`] },
  ]} />;
}
