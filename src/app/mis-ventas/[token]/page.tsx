import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCodeSalesByPublicToken } from "@/lib/discount-sales-data";
import { buildCodeShareUrl } from "@/lib/discount-links";
import { formatPrice, formatBoliviaDate } from "@/lib/format";
import { CopyableLink } from "@/components/CopyableLink";

export const metadata: Metadata = {
  title: "Tus ventas",
  robots: { index: false, follow: false },
};

export default async function CodeSalesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const summary = await getCodeSalesByPublicToken(token);
  if (!summary) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow mb-2">Tus ventas</p>
      <h1 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">{summary.code}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            summary.isActive
              ? "border-success bg-success/10 text-success"
              : "border-border text-muted"
          }`}
        >
          {summary.isActive ? "Activo" : "Inactivo"}
        </span>
        <span className="text-muted">
          {summary.expiresAt
            ? `Vence el ${formatBoliviaDate(summary.expiresAt)}`
            : "Sin vencimiento"}
        </span>
        {summary.maxUses !== null && (
          <span className="text-muted">
            Usos: {summary.usedCount} de {summary.maxUses}
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-muted">Ventas</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{summary.salesCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-muted">Vendido</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-accent-light">
            {formatPrice(summary.revenueTotal)}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-6">
        <p className="text-sm font-semibold">Compartí tu código</p>
        <p className="mt-1 text-sm text-muted">
          Con este link el descuento se aplica solo apenas la persona entra. No hace falta que
          escriba nada.
        </p>
        <div className="mt-4">
          <CopyableLink url={buildCodeShareUrl(summary.code)} label="Tu link para compartir" />
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Detalle</h2>
        {summary.sales.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Todavía no hay ventas con tu código. Compartí tu link y volvé a mirar.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-border">
              {summary.sales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="text-muted">{formatBoliviaDate(sale.soldAt)}</span>
                  <span className="font-semibold tabular-nums">{formatPrice(sale.total)}</span>
                </li>
              ))}
            </ul>
            {summary.truncated && (
              <p className="mt-3 text-xs text-muted">
                Mostramos tus últimas 100 ventas. Los totales de arriba las cuentan todas.
              </p>
            )}
          </>
        )}
        <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted">
          Cada venta es un pedido que ya cobramos. El monto es el total del pedido, envío
          incluido. Por privacidad de nuestros clientes no mostramos quién compró ni qué compró.
        </p>
      </div>

      <p className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger">
        Este link es tuyo: cualquiera que lo tenga ve estos números. No lo compartas. Si se te
        escapó, avisanos y te damos uno nuevo.
      </p>

      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/catalogo" className="focus-ring rounded hover:text-foreground">
          Ver el catálogo
        </Link>
      </p>
    </div>
  );
}
