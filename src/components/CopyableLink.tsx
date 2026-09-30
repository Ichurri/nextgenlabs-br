"use client";

import { useState } from "react";

/**
 * Campo de solo lectura + botón Copiar. Mismo patrón que PaymentInstructions:
 * si la Clipboard API falla (contexto no seguro, permiso denegado) no hay
 * respaldo razonable — el texto está a la vista y se selecciona a mano.
 */
export function CopyableLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin acción de respaldo: el link está visible y se copia a mano.
    }
  }

  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="focus-ring min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-muted"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="focus-ring shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-surface-2"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
