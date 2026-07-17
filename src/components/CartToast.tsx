"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";

/**
 * Aviso breve que aparece al añadir un producto al carrito.
 * No abre el carrito: solo confirma que el ítem se acumuló y ofrece abrirlo.
 */
export function CartToast() {
  const addNonce = useCart((s) => s.addNonce);
  const lastAddedName = useCart((s) => s.lastAddedName);
  const openDrawer = useCart((s) => s.openDrawer);

  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (addNonce === 0) return; // no mostrar en la carga inicial
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [addNonce]);

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-24 right-5 z-40 transition-all duration-300 sm:bottom-5 sm:right-24 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-2xl shadow-black/40">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-light">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Añadido al carrito</p>
          {lastAddedName && (
            <p className="truncate text-xs text-muted">{lastAddedName}</p>
          )}
        </div>
        <button
          onClick={() => {
            setVisible(false);
            openDrawer();
          }}
          className="focus-ring ml-1 shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-light"
        >
          Ver carrito
        </button>
      </div>
    </div>
  );
}
