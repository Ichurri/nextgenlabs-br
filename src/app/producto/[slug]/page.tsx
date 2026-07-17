import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProductBySlug, products } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { AddToCartControls } from "@/components/AddToCartControls";
import { ProductCoaViewer } from "@/components/ProductCoaViewer";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";
import { buildWhatsAppUrl } from "@/config/site";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
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
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-8 text-sm text-muted">
        <Link href="/catalogo" className="focus-ring rounded transition hover:text-foreground">
          ← Volver al catálogo
        </Link>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Imagen */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2">
          <Image
            src={product.image}
            alt={`Vial de ${product.name} ${product.dose}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <span className="absolute left-4 top-4 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-bold text-white">
            {product.dose}
          </span>
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
            {product.price > 0 ? formatPrice(product.price) : "Precio a consultar"}
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
              Solo para uso de investigación
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              No apto para consumo humano ni uso diagnóstico o terapéutico.
            </p>
          </div>

          <div className="mt-8">
            {product.price > 0 ? (
              <AddToCartControls product={product} />
            ) : (
              <WhatsAppCtaButton
                href={buildWhatsAppUrl(
                  `Hola Nextgen Labs, quiero consultar el precio de ${product.name} ${product.dose}.`
                )}
                label="Consultar precio por WhatsApp"
                variant="solid"
              />
            )}
          </div>

          {/* COA */}
          <div className="mt-10 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-wide">
              Certificado de Análisis (COA)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Cada lote se analiza de forma independiente para verificar su
              identidad y pureza.
            </p>
            {product.coaUrl ? (
              <ProductCoaViewer coaUrl={product.coaUrl} productName={product.name} />
            ) : (
              // PLACEHOLDER: sin COA cargado todavía para este lote.
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted">
                COA disponible bajo solicitud — {/* TODO: enlazar PDF del lote */}
                consúltalo por WhatsApp.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
