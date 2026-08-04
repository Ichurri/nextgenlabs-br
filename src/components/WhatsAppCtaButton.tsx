"use client";

import { track } from "@vercel/analytics";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

type WhatsAppCtaButtonProps = {
  href: string;
  label?: string;
  variant?: "solid" | "compact" | "floating";
  /** Solo aplica a variant="solid". Por defecto ocupa el ancho del contenedor. */
  fullWidth?: boolean;
  className?: string;
  /** Nombre del evento de analítica disparado al hacer clic (@vercel/analytics). */
  analyticsEvent?: string;
  /** Efecto secundario extra al hacer clic (ej. vaciar el carrito al finalizar pedido). */
  onClick?: () => void;
};

const variantClasses: Record<NonNullable<WhatsAppCtaButtonProps["variant"]>, string> = {
  solid:
    "flex items-center justify-center gap-2 rounded-lg bg-success px-5 py-3 text-sm font-bold text-white transition hover:bg-success-hover",
  compact:
    "inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-2 text-xs font-semibold text-white transition hover:bg-success-hover",
  floating:
    "fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-success shadow-lg shadow-black/40 transition hover:scale-105 hover:bg-success-hover",
};

const iconSizeByVariant: Record<NonNullable<WhatsAppCtaButtonProps["variant"]>, string> = {
  solid: "h-[18px] w-[18px]",
  compact: "h-3.5 w-3.5",
  floating: "h-7 w-7",
};

/** Botón de contacto/pedido por WhatsApp: mismo ícono y estilo en todo el sitio. */
export function WhatsAppCtaButton({
  href,
  label,
  variant = "solid",
  fullWidth = true,
  className = "",
  analyticsEvent,
  onClick,
}: WhatsAppCtaButtonProps) {
  const widthClass = variant === "solid" ? (fullWidth ? "w-full" : "w-auto") : "";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ?? "Contactar por WhatsApp"}
      onClick={() => {
        if (analyticsEvent) track(analyticsEvent);
        onClick?.();
      }}
      className={`focus-ring ${variantClasses[variant]} ${widthClass} ${className}`.trim()}
    >
      <WhatsAppIcon className={iconSizeByVariant[variant]} />
      {label && variant !== "floating" && <span>{label}</span>}
    </a>
  );
}
