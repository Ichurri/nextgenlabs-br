"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useFocusTrap } from "@/lib/useFocusTrap";

const STORAGE_KEY = "nextgen-age-verified";

const trustBadges = [
  { label: "Probado por", value: "Terceros", Icon: ShieldIcon },
  { label: "COA", value: "Aprobado", Icon: DocCheckIcon },
  { label: "Analizado", value: "7 veces", Icon: LabIcon },
  { label: "Despacho", value: "Mismo día", Icon: TruckIcon },
];

export function AgeGate() {
  // `null` = aún no sabemos (evita parpadeo en SSR); true/false una vez montado.
  const [verified, setVerified] = useState<boolean | null>(null);
  // Paso 1 = verificación de edad, Paso 2 = sellos de confianza.
  const [step, setStep] = useState<1 | 2>(1);

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

  function enter() {
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

  const dialogRef = useFocusTrap<HTMLDivElement>(verified === false);

  if (verified === null || verified === true) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 px-4 backdrop-blur-sm"
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

        {step === 1 ? (
          <>
            <h1
              id="age-gate-title"
              className="mb-3 text-xl font-semibold tracking-wide"
            >
              Verificación de edad
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              Este sitio contiene productos destinados{" "}
              <span className="font-medium text-foreground">
                exclusivamente al uso de investigación
              </span>
              . No aptos para consumo humano ni uso diagnóstico o terapéutico.
              Debes ser mayor de 21 años para ingresar.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep(2)}
                className="focus-ring w-full rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
              >
                Soy mayor de 21 años · Continuar
              </button>
              <button
                onClick={leave}
                className="focus-ring w-full rounded-lg border border-border px-5 py-3 text-sm font-medium text-muted transition hover:bg-surface-2"
              >
                Salir
              </button>
            </div>
            <p className="mt-6 text-xs text-muted/70">
              Al continuar aceptas nuestros términos de uso y confirmas comprender
              el carácter investigativo de los productos.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow mb-2">Calidad verificada</p>
            <h1
              id="age-gate-title"
              className="mb-6 text-xl font-semibold tracking-wide"
            >
              Nuestro estándar
            </h1>
            <ul className="mb-7 grid grid-cols-2 gap-3 text-left">
              {trustBadges.map(({ label, value, Icon }) => (
                <li
                  key={label}
                  className="rounded-xl border border-border bg-surface-2 p-4"
                >
                  <Icon />
                  <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                    {label}
                  </p>
                  <p className="text-sm font-bold text-foreground">{value}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3">
              <button
                onClick={enter}
                className="focus-ring w-full rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
              >
                Ingresar
              </button>
              <button
                onClick={() => setStep(1)}
                className="focus-ring w-full rounded-lg border border-border px-5 py-3 text-sm font-medium text-muted transition hover:bg-surface-2"
              >
                Volver
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --- Iconos de los sellos de confianza --- */

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent-light">
      {children}
    </span>
  );
}

function ShieldIcon() {
  return (
    <IconWrap>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </IconWrap>
  );
}

function DocCheckIcon() {
  return (
    <IconWrap>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    </IconWrap>
  );
}

function LabIcon() {
  return (
    <IconWrap>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 3h6" />
        <path d="M10 3v6.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3" />
        <path d="M7.5 15h9" />
      </svg>
    </IconWrap>
  );
}

function TruckIcon() {
  return (
    <IconWrap>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 17h4V5H2v12h2" />
        <path d="M14 8h4l3 3v6h-3" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    </IconWrap>
  );
}
