import type { Metadata } from "next";
import { siteConfig, buildWhatsAppUrl } from "@/config/site";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Entre em contato pelo WhatsApp ou e-mail sobre pedidos e produtos para pesquisa.",
};

export default function ContatoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow mb-2">Contato</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Estamos aqui para ajudar
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Pedidos e dúvidas são atendidos pelo WhatsApp. Nossa operação brasileira fica em São Paulo.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold tracking-wide">WhatsApp</h2>
          {/* TODO: reemplazar número visible en siteConfig.contact.whatsappDisplay */}
          <p className="mt-1 text-sm text-muted">
            {siteConfig.contact.whatsappDisplay}
          </p>
          <WhatsAppCtaButton
            href={buildWhatsAppUrl("Olá Nextgen Labs, tenho uma dúvida.")}
            label="Falar pelo WhatsApp"
            variant="solid"
            fullWidth={false}
            analyticsEvent="whatsapp_click_contact"
            className="mt-4"
          />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold tracking-wide">E-mail</h2>
          {/* TODO: reemplazar correo en siteConfig.contact.email */}
          <p className="mt-1 text-sm text-muted">{siteConfig.contact.email}</p>
          <p className="mt-4 text-xs text-muted">
            {siteConfig.contact.city}
          </p>
        </div>
      </div>

      <p className="mt-10 rounded-lg border border-border bg-surface-2 p-4 text-xs leading-relaxed text-muted">
        Produtos destinados exclusivamente à pesquisa laboratorial. Não destinados ao consumo humano nem ao uso diagnóstico ou terapêutico.
      </p>
    </div>
  );
}
