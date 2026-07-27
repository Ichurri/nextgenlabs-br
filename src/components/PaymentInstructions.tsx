"use client";

import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { PAYMENT } from "@/config/payment";

export function PaymentInstructions({ total }: { total: number }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const accountText = `${PAYMENT.bank} · ${PAYMENT.accountType}\nTitular: ${PAYMENT.accountHolder}\nCuenta: ${PAYMENT.accountNumber}`;
    try {
      await navigator.clipboard.writeText(accountText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API puede fallar sin contexto seguro o sin permiso; no hay
      // acción de respaldo razonable, el usuario copia los datos a mano.
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
        Cómo pagar
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums">{formatPrice(total)}</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="relative mx-auto h-40 w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-white sm:mx-0">
          <Image
            src={PAYMENT.qrImage}
            alt="QR para pagar por transferencia"
            fill
            sizes="160px"
            className="object-contain p-2"
          />
        </div>

        <div className="space-y-1 text-sm">
          <p className="font-semibold">{PAYMENT.bank}</p>
          <p className="text-muted">{PAYMENT.accountType}</p>
          <p className="text-muted">Titular: {PAYMENT.accountHolder}</p>
          <p className="text-muted">Cuenta: {PAYMENT.accountNumber}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="focus-ring mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:bg-surface-2"
          >
            {copied ? "Copiado ✓" : "Copiar datos de la cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
