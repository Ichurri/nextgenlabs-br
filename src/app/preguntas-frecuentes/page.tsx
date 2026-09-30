import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Perguntas frequentes", description: "Dúvidas sobre produtos, pedidos e frete da Nextgen Labs Brasil." };

const faqs = [
  { q: "Para que servem os produtos?", a: "Os produtos são destinados exclusivamente à pesquisa laboratorial. Não são destinados ao consumo humano nem ao uso diagnóstico ou terapêutico." },
  { q: "Como faço um pedido?", a: "Adicione os produtos ao carrinho e selecione Finalizar pedido pelo WhatsApp. Enviaremos a mensagem com o resumo do pedido para combinar os próximos passos." },
  { q: "Como funciona o pagamento?", a: "O método de pagamento é combinado pelo WhatsApp após a confirmação do pedido. Este site não processa pagamentos online." },
  { q: "Qual é o frete?", a: "O carrinho calcula R$ 35 por pedido. A disponibilidade e os detalhes de entrega são confirmados pelo WhatsApp." },
  { q: "Como consulto o certificado de análise (COA)?", a: "Confira a página do produto. Quando o certificado de um lote não estiver disponível no site, consulte nossa equipe pelo WhatsApp." },
];

export default function FaqPage() {
  return <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
    <p className="eyebrow mb-2">Ajuda</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h1>
    <div className="mt-10 space-y-3">{faqs.map((item) => <details key={item.q} className="group rounded-xl border border-border bg-surface p-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="focus-ring flex cursor-pointer items-center justify-between gap-4 rounded text-base font-semibold">{item.q}<span className="text-muted transition group-open:rotate-45">+</span></summary>
      <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
    </details>)}</div>
    <div className="mt-10 rounded-xl border border-border bg-surface p-6 text-center"><p className="text-sm text-muted">Não encontrou sua resposta?</p><Link href="/contacto" className="focus-ring mt-3 inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light">Entre em contato</Link></div>
  </div>;
}
