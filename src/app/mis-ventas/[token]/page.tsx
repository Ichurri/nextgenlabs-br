import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCodeSalesByPublicToken } from "@/lib/discount-sales-data";
import { buildCodeShareUrl } from "@/lib/discount-links";
import { formatPrice, formatBrazilDate } from "@/lib/format";
import { CopyableLink } from "@/components/CopyableLink";

export const metadata: Metadata = {
  title: "Suas vendas",
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
      <p className="eyebrow mb-2">Suas vendas</p>
      <h1 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">{summary.code}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            summary.isActive
              ? "border-success bg-success/10 text-success"
              : "border-border text-muted"
          }`}
        >
          {summary.isActive ? "Ativo" : "Inativo"}
        </span>
        <span className="text-muted">
          {summary.expiresAt
            ? `Vence em ${formatBrazilDate(summary.expiresAt)}`
            : "Sem vencimento"}
        </span>
        {summary.maxUses !== null && (
          <span className="text-muted">
            Usos: {summary.usedCount} de {summary.maxUses}
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-muted">Vendas</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{summary.salesCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-muted">Total vendido</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-accent-light">
            {formatPrice(summary.revenueTotal)}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-6">
        <p className="text-sm font-semibold">Compartilhe seu cupom</p>
        <p className="mt-1 text-sm text-muted">
          Ao acessar este link, o cupom é aplicado automaticamente.
        </p>
        <div className="mt-4">
          <CopyableLink url={buildCodeShareUrl(summary.code)} label="Link para compartilhar" />
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Detalle</h2>
        {summary.sales.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Ainda não há vendas com seu cupom. Compartilhe seu link e volte a consultar.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-border">
              {summary.sales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="text-muted">{formatBrazilDate(sale.soldAt)}</span>
                  <span className="font-semibold tabular-nums">{formatPrice(sale.total)}</span>
                </li>
              ))}
            </ul>
            {summary.truncated && (
              <p className="mt-3 text-xs text-muted">
                Mostramos as 100 vendas mais recentes. Os totais acima incluem todas as vendas.
              </p>
            )}
          </>
        )}
        <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted">
          Cada venda corresponde a um pedido pago. O valor inclui o frete. Por privacidade, não exibimos dados dos compradores.
        </p>
      </div>

      <p className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger">
        Este link é privado. Qualquer pessoa que o tenha poderá ver estes valores. Se ele for compartilhado por engano, entre em contato para receber outro.
      </p>

      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/catalogo" className="focus-ring rounded hover:text-foreground">
          Ver catálogo
        </Link>
      </p>
    </div>
  );
}
