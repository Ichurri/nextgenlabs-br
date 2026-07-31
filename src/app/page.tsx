import Link from "next/link";
import { Hero } from "@/components/Hero";
import { ProductCard } from "@/components/ProductCard";
import { getFeaturedProducts } from "@/lib/products-data";
import { siteConfig } from "@/config/site";

const trustCards = [
  {
    eyebrow: "Verificado independientemente",
    title: "ANALIZADO 7 VECES",
    body: "Probado de forma independiente para garantizar su pureza e identidad antes de publicar cualquier lote, y el certificado se publica para que puedas verificarlo.",
  },
  {
    eyebrow: "Respaldado por COA (Certificado de Análisis)",
    title: "CALIDAD GARANTIZADA",
    body: "Cada lote está garantizado para coincidir con el certificado que publicamos; verificado según las especificaciones, o lo solucionamos.",
  },
  {
    eyebrow: "Discreción y soporte",
    title: "ENVÍO DISCRETO",
    body: "Coordinamos cada pedido por WhatsApp con empaque discreto y acompañamiento directo, para que tu material de investigación llegue con total confidencialidad.",
  },
];

export default async function HomePage() {
  const featured = await getFeaturedProducts();

  return (
    <>
      <Hero />

      {/* Sobre Nextgen Labs */}
      <section id="sobre" className="bg-vignette scroll-mt-20">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="eyebrow mb-4">Sobre Nextgen Labs</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Integridad científica en cada lote
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
            Nextgen Labs es un proveedor de péptidos exclusivamente para uso de
            investigación, comprometido con ofrecer una calidad excepcional.
            Nuestros compuestos son sometidos a pruebas de pureza para cumplir
            constantemente con los más altos estándares, la transparencia total y
            la integridad científica. Cada compuesto de nuestro catálogo es
            analizado de manera independiente para verificar su identidad y
            pureza, y compartimos orgullosamente esos resultados: sin datos
            ocultos ni atajos.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted">
            Como{" "}
            <span className="font-semibold text-foreground">
              distribuidor oficial de {siteConfig.partner.name}
            </span>{" "}
            en Bolivia, ponemos a tu alcance el mismo estándar de pureza y
            trazabilidad reconocido internacionalmente.
          </p>
        </div>
      </section>

      {/* Tarjetas de confianza */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3 md:gap-0">
          {trustCards.map((card, i) => (
            <div
              key={card.title}
              className={`px-2 md:px-8 ${i > 0 ? "md:border-l md:border-border" : ""}`}
            >
              <p className="eyebrow mb-3">{card.eyebrow}</p>
              <h3 className="mb-3 text-2xl font-bold tracking-wide">{card.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      <section className="bg-vignette">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow mb-2">Catálogo</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Compuestos destacados
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="focus-ring rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-surface-2"
            >
              Ver todo el catálogo
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Franja de confianza / partner */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6">
          <p className="eyebrow">En alianza con</p>
          <a
            href={siteConfig.partner.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring group flex flex-col items-center gap-3 rounded-lg"
          >
            <OnyxLogo />
            <span className="text-sm text-muted transition group-hover:text-foreground">
              Distribuidor oficial de {siteConfig.partner.name}
            </span>
          </a>
        </div>
      </section>
    </>
  );
}

/** Logo textual de Onyx Research (marca del partner). */
function OnyxLogo() {
  return (
    <div className="flex items-center gap-3 opacity-90 transition group-hover:opacity-100">
      <svg width="44" height="44" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <path
          d="M50 6 88 28v44L50 94 12 72V28z"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M38 34c8 8 16 8 24 16M62 34c-8 8-16 8-24 16"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M40 32h20M40 68h20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="text-left leading-none">
        <span className="block text-2xl font-extrabold tracking-tight">ONYX</span>
        <span className="block text-xs font-semibold tracking-[0.35em] text-muted">
          RESEARCH
        </span>
      </div>
    </div>
  );
}
