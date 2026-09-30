import Link from "next/link";
import { Hero } from "@/components/Hero";
import { ProductCard } from "@/components/ProductCard";
import { getFeaturedProducts } from "@/lib/products-data";

const cards = [
  { title: "Catálogo em reais", body: "Preços individuais em R$ para os produtos disponíveis no Brasil." },
  { title: "Informações por produto", body: "Consulte a apresentação e os certificados disponíveis na página de cada produto." },
  { title: "Atendimento direto", body: "Envie seu pedido pelo WhatsApp para combinar pagamento e entrega." },
];

export default async function HomePage() {
  const featured = await getFeaturedProducts();
  return <>
    <Hero />
    <section id="sobre" className="bg-vignette scroll-mt-20">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="eyebrow mb-4">Sobre a Nextgen Labs</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Compostos para pesquisa laboratorial</h2>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
          Conheça o catálogo Onyx Research da Nextgen Labs Brasil. Cada página reúne apresentação,
          preço em reais e informações disponíveis sobre o produto. Os compostos são destinados
          exclusivamente à pesquisa laboratorial.
        </p>
      </div>
    </section>
    <section className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3 md:gap-0">
        {cards.map((card, i) => <div key={card.title} className={`px-2 md:px-8 ${i > 0 ? "md:border-l md:border-border" : ""}`}>
          <h3 className="mb-3 text-2xl font-bold tracking-wide">{card.title}</h3>
          <p className="text-sm leading-relaxed text-muted">{card.body}</p>
        </div>)}
      </div>
    </section>
    <section className="bg-vignette">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="eyebrow mb-2">Catálogo</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Produtos em destaque</h2></div>
          <Link href="/catalogo" className="focus-ring rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-surface-2">Ver catálogo completo</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{featured.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      </div>
    </section>
  </>;
}
