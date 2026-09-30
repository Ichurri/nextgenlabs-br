import { formatPrice } from "@/lib/format";

/** Os dados de pagamento são confirmados no atendimento pelo WhatsApp. */
export function PaymentInstructions({ total }: { total: number }) {
  return <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-6">
    <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">Pagamento pelo WhatsApp</p>
    <p className="mt-3 text-3xl font-bold tabular-nums">{formatPrice(total)}</p>
    <p className="mt-4 text-sm text-muted">Entre em contato pelo WhatsApp para confirmar o pedido e combinar o método de pagamento.</p>
  </div>;
}
