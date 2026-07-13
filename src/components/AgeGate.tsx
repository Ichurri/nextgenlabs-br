"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const STORAGE_KEY = "nextgen-age-verified";

export function AgeGate() {
  // `null` = aún no sabemos (evita parpadeo en SSR); true/false una vez montado.
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setVerified(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setVerified(false);
    }
  }, []);

  useEffect(() => {
    if (verified === false) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [verified]);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setVerified(true);
  }

  function leave() {
    window.location.href = "https://www.google.com";
  }

  if (verified === null || verified === true) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl animate-fade-in">
        <Image
          src="/logo.svg"
          alt="Nextgen Labs"
          width={180}
          height={60}
          className="mx-auto mb-6 h-auto w-40 object-contain"
          priority
        />
        <h1
          id="age-gate-title"
          className="mb-3 text-xl font-semibold tracking-wide"
        >
          Verificación de edad
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          Este sitio contiene productos destinados{" "}
          <span className="text-foreground font-medium">
            exclusivamente al uso de investigación
          </span>
          . No aptos para consumo humano ni uso diagnóstico o terapéutico. Debes
          ser mayor de 18 años para ingresar.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={accept}
            className="w-full rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
          >
            Soy mayor de edad · Ingresar
          </button>
          <button
            onClick={leave}
            className="w-full rounded-lg border border-border px-5 py-3 text-sm font-medium text-muted transition hover:bg-surface-2"
          >
            Salir
          </button>
        </div>
        <p className="mt-6 text-xs text-muted/70">
          Al ingresar aceptas nuestros términos de uso y confirmas comprender el
          carácter investigativo de los productos.
        </p>
      </div>
    </div>
  );
}
