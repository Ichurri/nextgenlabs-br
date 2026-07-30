"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart, cartCount } from "@/lib/cart";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/preguntas-frecuentes", label: "FAQ" },
  { href: "/contacto", label: "Contacto" },
];

export function Header({ customerEmail }: { customerEmail?: string | null }) {
  const items = useCart((s) => s.items);
  const openDrawer = useCart((s) => s.openDrawer);
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = cartCount(items);
  const accountHref = customerEmail ? "/cuenta/pedidos" : "/cuenta/ingresar";
  const accountLabel = customerEmail ? "Mi cuenta" : "Ingresar";

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="focus-ring rounded flex items-center gap-2" aria-label="Nextgen Labs — inicio">
          <Image
            src="/logo.svg"
            alt="Nextgen Labs"
            width={150}
            height={44}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring rounded text-sm font-medium text-muted transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={accountHref}
            aria-label={accountLabel}
            className="focus-ring hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-2 sm:flex"
          >
            <AccountIcon />
            {accountLabel}
          </Link>

          <button
            onClick={openDrawer}
            aria-label="Abrir carrito"
            className="focus-ring relative rounded-lg border border-border p-3 text-foreground transition hover:bg-surface-2"
          >
            <CartIcon />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            className="focus-ring rounded-lg border border-border p-3 text-foreground transition hover:bg-surface-2 md:hidden"
          >
            <MenuIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-surface md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="focus-ring rounded border-b border-border/50 py-3 text-sm font-medium text-muted transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={accountHref}
              onClick={() => setMobileOpen(false)}
              className="focus-ring rounded border-b border-border/50 py-3 text-sm font-medium text-muted transition hover:text-foreground"
            >
              {accountLabel}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}
