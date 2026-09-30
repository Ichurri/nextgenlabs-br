import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCatalog, getProductBySlug, getRelatedProducts } from "@/lib/products-data";
import { isInStock } from "@/lib/products.types";
import { formatPrice } from "@/lib/format";
import { AddToCartControls } from "@/components/AddToCartControls";
import { ProductCard } from "@/components/ProductCard";
import { ProductCoaViewer } from "@/components/ProductCoaViewer";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";
import { buildWhatsAppUrl, siteConfig } from "@/config/site";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: `${product.name} ${product.dose}`,
    description: product.description ?? product.highlights.join(" · "),
    openGraph: { images: [{ url: product.image }] },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const inStock = isInStock(product);
  const relatedProducts = await getRelatedProducts(product);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} ${product.dose}`,
    image: `${siteConfig.url}${product.image}`,
    description: product.description ?? product.highlights.join(" "),
    category: product.category,
    ...(product.price > 0 && {
      offers: {
        "@type": "Offer",
        priceCurrency: "BRL",
        price: product.price,
        availability: inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: `${siteConfig.url}/producto/${product.slug}`,
      },
    }),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <nav className="mb-8 text-sm text-muted">
        <Link href="/catalogo" className="focus-ring rounded transition hover:text-foreground">
          ← Voltar ao catálogo
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        {/* Imagen: cuadrada en móvil (una sola columna). En desktop se
            estira a la altura real de la columna de info (más alta por su
            contenido) en vez de quedar cuadrada con un hueco vacío debajo;
            object-cover recorta el encuadre sin deformarlo. */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2 md:aspect-auto">
          <Image
            src={product.image}
            alt={`Frasco de ${product.name} ${product.dose}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`object-cover ${inStock ? "" : "opacity-50 grayscale"}`}
            priority
          />
          <span className="absolute left-4 top-4 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-bold text-white">
            {product.dose}
          </span>
          {product.isNew && inStock && (
            <span className="absolute bottom-4 left-4 rounded-md bg-success px-2.5 py-1 text-xs font-bold text-white">
              Novo
            </span>
          )}
          {!inStock && (
            <span className="absolute bottom-4 left-4 rounded-md border border-border bg-background/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-foreground backdrop-blur">
              Esgotado
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="eyebrow mb-2">{product.category}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold">
              {product.dose}
            </span>
            <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold">
              {product.purity}
            </span>
            <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold">
              {product.form}
            </span>
          </div>

          <p className="mt-6 text-3xl font-bold">
            {product.price > 0 ? formatPrice(product.price) : "Preço sob consulta"}
          </p>

          {product.description && (
            <p className="mt-6 text-sm leading-relaxed text-muted">
              {product.description}
            </p>
          )}

          {/* Beneficios / viñetas */}
          <ul className="mt-6 space-y-2.5">
            {product.highlights.map((point) => (
              <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          {/* Aviso destacado */}
          <div className="mt-6 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
              Exclusivamente para pesquisa
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Não destinado ao consumo humano nem ao uso diagnóstico ou terapêutico.
            </p>
          </div>

          <div className="mt-8">
            {!inStock ? (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-border px-6 py-3.5 text-sm font-semibold text-muted"
              >
                Esgotado — volte em breve
              </button>
            ) : product.price > 0 ? (
              <AddToCartControls product={product} />
            ) : (
              <WhatsAppCtaButton
                href={buildWhatsAppUrl(
                  `Olá Nextgen Labs, gostaria de consultar o preço de ${product.name} ${product.dose}.`
                )}
                label="Consultar preço pelo WhatsApp"
                variant="solid"
                analyticsEvent="whatsapp_click_consult"
              />
            )}
          </div>

          {/* COA */}
          <div className="mt-8 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-wide">
              Certificado de Análise (COA)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Consulte o certificado de análise disponível para o lote deste produto.
            </p>
            {product.coaUrl ? (
              <ProductCoaViewer coaUrl={product.coaUrl} productName={product.name} />
            ) : (
              // PLACEHOLDER: sin COA cargado todavía para este lote.
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted">
                COA sob consulta — {/* TODO: enlazar PDF del lote */}
                fale conosco pelo WhatsApp.
              </p>
            )}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-xl font-bold tracking-tight sm:text-2xl">
            Produtos relacionados
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {relatedProducts.map((related) => (
              <ProductCard key={related.slug} product={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
