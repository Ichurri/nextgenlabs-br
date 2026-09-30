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
        className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-semibold text-accent-light transition hover:bg-accent/10"
      >
        <DocumentCheckIcon />
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
                Certificado de Análise · {productName}
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar COA"
                className="focus-ring rounded-lg p-3 text-muted transition hover:bg-surface-2 hover:text-foreground"
              >
                <CloseIcon />
              </button>
            </div>

            {pdfSupported ? (
              <>
                {/* Passe-partout oscuro alrededor del PDF: el documento (fondo
                    blanco, inevitable) queda enmarcado en vez de tocar los
                    bordes del modal. */}
                <div className="bg-background/40 p-3 sm:p-4">
                  <iframe
                    src={`${coaUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    title={`COA de ${productName}`}
                    className="h-[55vh] w-full rounded-lg border border-border bg-white sm:h-[65vh]"
                  />
                </div>
                <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
                  <CoaActions coaUrl={coaUrl} productName={productName} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-5 bg-surface-2 px-6 py-16 text-center">
                <p className="max-w-sm text-sm leading-relaxed text-muted">
                  Seu navegador não consegue mostrar o PDF aqui. Abra o arquivo para visualizar ou baixar.
                </p>
                <CoaActions coaUrl={coaUrl} productName={productName} size="lg" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function CoaActions({
  coaUrl,
  productName,
  size = "sm",
}: {
  coaUrl: string;
  productName: string;
  size?: "sm" | "lg";
}) {
  const sizeClasses = size === "lg" ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-xs";
  const iconClasses = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  const downloadName = `COA-${productName.replace(/\s+/g, "-")}.pdf`;

  return (
    <>
      <a
        href={coaUrl}
        download={downloadName}
        className={`focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-border font-semibold text-foreground transition hover:bg-surface-2 ${sizeClasses}`}
      >
        <DownloadIcon className={iconClasses} />
        Baixar PDF
      </a>
      <a
        href={coaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-border font-semibold text-foreground transition hover:bg-surface-2 ${sizeClasses}`}
      >
        <ExternalLinkIcon className={iconClasses} />
        Abrir em nova aba
      </a>
    </>
  );
}

function DocumentCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

function DownloadIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3h7v7" />
      <path d="M21 3 10 14" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function CloseIcon() {
  return (
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
  );
}
