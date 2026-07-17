import type { Metadata } from "next";
import { siteConfig, buildWhatsAppUrl } from "@/config/site";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contáctanos por WhatsApp o correo para realizar tu pedido o resolver dudas sobre nuestros productos de investigación.",
};

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow mb-2">Contacto</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Estamos para ayudarte
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Todos los pedidos y consultas se coordinan directamente por WhatsApp. Te
        respondemos a la brevedad para ayudarte con tu material de investigación.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold tracking-wide">WhatsApp</h2>
          {/* TODO: reemplazar número visible en siteConfig.contact.whatsappDisplay */}
          <p className="mt-1 text-sm text-muted">
            {siteConfig.contact.whatsappDisplay}
          </p>
          <WhatsAppCtaButton
            href={buildWhatsAppUrl("Hola Nextgen Labs, tengo una consulta.")}
            label="Escribir por WhatsApp"
            variant="solid"
            fullWidth={false}
            analyticsEvent="whatsapp_click_contact"
            className="mt-4"
          />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold tracking-wide">Correo</h2>
          {/* TODO: reemplazar correo en siteConfig.contact.email */}
          <p className="mt-1 text-sm text-muted">{siteConfig.contact.email}</p>
          <p className="mt-4 text-xs text-muted">
            {siteConfig.contact.city}
          </p>
        </div>
      </div>

      <p className="mt-10 rounded-lg border border-border bg-surface-2 p-4 text-xs leading-relaxed text-muted">
        Productos exclusivamente para uso de investigación. No aptos para consumo
        humano ni uso diagnóstico o terapéutico.
      </p>
    </div>
  );
}
