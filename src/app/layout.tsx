import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AgeGate } from "@/components/AgeGate";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CartDrawer } from "@/components/CartDrawer";
import { CartToast } from "@/components/CartToast";
import { CatalogProvider } from "@/components/CatalogProvider";
import { getCatalog } from "@/lib/products-data";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Peptídeos para pesquisa`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "peptídeos",
    "pesquisa",
    "Brasil",
    "Nextgen Labs",
    "Onyx Research",
    "research use only",
  ],
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — Peptídeos para pesquisa`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — Peptídeos para pesquisa`,
    description: siteConfig.description,
  },
  icons: { icon: "/logo.svg" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/logo.svg`,
  description: siteConfig.description,
  email: siteConfig.contact.email,
  address: {
    "@type": "PostalAddress",
    addressLocality: siteConfig.contact.city,
    addressCountry: "BR",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const catalog = await getCatalog();

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <CatalogProvider catalog={catalog}>
          <a href="#main-content" className="skip-link">
            Pular para o conteúdo
          </a>
          <AgeGate />
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
          <CartDrawer />
          <CartToast />
        </CatalogProvider>
        <Analytics />
      </body>
    </html>
  );
}
