"use client";

import { useEffect, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface ProductCoaViewerProps {
  coaUrl: string;
  productName: string;
}

/**
 * iOS Safari (y navegadores basados en WebKit en iOS) no renderiza PDFs
 * dentro de un <iframe>: se queda en blanco. `pdfViewerEnabled` es la señal
 * moderna; si no existe, se detecta iOS por user agent como respaldo.
 */
function canRenderPdfInline(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { pdfViewerEnabled?: boolean };
  if (typeof nav.pdfViewerEnabled === "boolean") return nav.pdfViewerEnabled;
  const isIOS = /iPad|iPhone|iPod/.test(nav.userAgent);
  return !isIOS;
}

export function ProductCoaViewer({ coaUrl, productName }: ProductCoaViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfSupported, setPdfSupported] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setPdfSupported(canRenderPdfInline());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface-2"
      >
        Ver COA
      </button>

      {isOpen && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`COA de ${productName}`}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">
                Certificado de Análisis · {productName}
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar COA"
                className="focus-ring rounded-lg p-3 text-muted transition hover:bg-surface-2 hover:text-foreground"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {pdfSupported ? (
              <iframe
                src={coaUrl}
                title={`COA de ${productName}`}
                className="h-[70vh] w-full bg-surface-2"
              />
            ) : (
              <div className="flex h-[50vh] flex-col items-center justify-center gap-4 bg-surface-2 px-6 text-center">
                <p className="text-sm leading-relaxed text-muted">
                  Tu navegador no puede mostrar el PDF aquí. Ábrelo directamente
                  para verlo o descargarlo.
                </p>
                <a
                  href={coaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
                >
                  Abrir COA (PDF)
                </a>
              </div>
            )}

            <div className="border-t border-border px-4 py-3">
              <a
                href={coaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded text-xs font-semibold text-accent-light transition hover:text-accent"
              >
                Abrir PDF en una pestaña nueva
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
