import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Image
              src="/logo.svg"
              alt="Nextgen Labs"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
            />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Compostos destinados exclusivamente à pesquisa laboratorial. Conheça{" "}
              <a
                href={siteConfig.partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded text-accent-light hover:underline"
              >
                {siteConfig.partner.name}
              </a>.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide">Loja</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/catalogo" className="focus-ring rounded hover:text-foreground">Catálogo</Link></li>
              <li><Link href="/carrito" className="focus-ring rounded hover:text-foreground">Carrinho</Link></li>
              <li><Link href="/envios" className="focus-ring rounded hover:text-foreground">Frete</Link></li>
              <li><Link href="/contacto" className="focus-ring rounded hover:text-foreground">Contato</Link></li>
              <li><Link href="/preguntas-frecuentes" className="focus-ring rounded hover:text-foreground">Perguntas frequentes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide">Legal</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/terminos" className="focus-ring rounded hover:text-foreground">Termos e condições</Link></li>
              <li><Link href="/privacidad" className="focus-ring rounded hover:text-foreground">Política de privacidade</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-foreground">Aviso:</span>{" "}
            Produtos destinados exclusivamente à pesquisa laboratorial. Não destinados ao consumo humano nem ao uso diagnóstico ou terapêutico.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row">
          <p>
            © {year} {siteConfig.name}. Todos os direitos reservados.
          </p>
          <p>
            Catálogo {siteConfig.partner.name}.
          </p>
          <a
            href="https://www.instagram.com/loop.digital.corp/"
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex items-center gap-2 rounded hover:text-foreground"
          >
            <span>Supported by</span>
            <Image
              src="/loop.png"
              alt="Loop"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
