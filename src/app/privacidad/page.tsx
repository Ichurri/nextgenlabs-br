import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Política de privacidade", description: "Informações de privacidade da Nextgen Labs Brasil." };

// Texto inicial: revisar com assessoria jurídica brasileira antes da publicação.
export default function PrivacidadPage() {
  return <LegalPage eyebrow="Legal" title="Política de privacidade" updated="setembro de 2026" sections={[
    { heading: "1. Dados informados", body: ["O carrinho e a confirmação de idade são armazenados no navegador. Ao iniciar um pedido pelo WhatsApp, você escolhe quais dados de nome, cidade e endereço incluir na mensagem.", "Quando um pedido é registrado pela equipe, podemos armazenar nome, telefone, cidade, endereço e itens para atendimento e acompanhamento."] },
    { heading: "2. Uso dos dados", body: ["Usamos essas informações para responder consultas, organizar pedidos e acompanhar a entrega. O acesso aos registros de pedidos é restrito à equipe autorizada."] },
    { heading: "3. Seus pedidos", body: ["Para solicitar informações ou correção de dados de um pedido, entre em contato pelo canal abaixo."] },
    { heading: "4. Contato", body: [`Escreva para ${siteConfig.contact.email} se tiver dúvidas sobre privacidade.`] },
  ]} />;
}
